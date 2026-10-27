package com.example.LMS.service;

import com.example.LMS.DTO.ModuleRequest;
import com.example.LMS.DTO.ModuleResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.model.Course;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.Module;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.LessonRepository;
import com.example.LMS.repository.ModuleRepository;
import com.example.LMS.repository.UserRepository;
import com.example.LMS.exception.UnauthorizedAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class ModuleService {

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private UserRepository userRepository;

    public ModuleResponse makeResponse(Module module) {
        List<Integer> lessonIds = new ArrayList<>();
        if (module.getLessons() != null) {
            for (Lesson lesson : module.getLessons()) {
                lessonIds.add(lesson.getId());
            }
        }
        return new ModuleResponse(module.getId(), module.getTitle(), lessonIds, module.getDescription(), module.getPublished());
    }

    // ownerId: an admin building a teacher's course creates the module for that teacher.
    public ModuleResponse addModule(ModuleRequest moduleRequest, Integer ownerId) {
        User teacher = ownerFor(ownerId);
        if (moduleRepository.findByTitleIgnoreCaseAndTeacher(moduleRequest.title().trim(), teacher) != null) {
            throw new ResourceAlreadyExistException("You already have a module with title " + moduleRequest.title());
        }

        Module module = new Module();
        module.setTeacher(teacher);
        applyRequest(module, moduleRequest, teacher);
        return makeResponse(moduleRepository.save(module));
    }

    private User ownerFor(Integer ownerId) {
        User me = currentUserService.getCurrentUser();
        if (ownerId == null || ownerId.equals(me.getId())) {
            return me;
        }
        if (!currentUserService.isAdmin(me)) {
            throw new UnauthorizedAccessException("Only an admin can create content for another teacher");
        }
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourseNotFoundException("User not found with id " + ownerId));
    }

    public List<ModuleResponse> getAllModule() {
        User teacher = currentUserService.getCurrentUser();
        return moduleRepository.findAllByTeacher(teacher).stream().map(this::makeResponse).toList();
    }

    public ModuleResponse getModuleById(Integer id) {
        return makeResponse(findOwnedModule(id));
    }

    public ModuleResponse updateModule(Integer id, ModuleRequest moduleRequest) {
        Module module = findOwnedModule(id);
        Module sameTitle = moduleRepository.findByTitleIgnoreCaseAndTeacher(moduleRequest.title().trim(), module.getTeacher());
        if (sameTitle != null && !sameTitle.getId().equals(id)) {
            throw new ResourceAlreadyExistException("You already have a module with title " + moduleRequest.title());
        }
        applyRequest(module, moduleRequest, module.getTeacher());
        return makeResponse(moduleRepository.save(module));
    }

    @Transactional
    public Boolean deleteModule(Integer id) {
        Module module = findOwnedModule(id);
        // Remove the module from every course first (Course owns the course-module link).
        for (Course course : courseRepository.findByModulesContaining(module)) {
            course.getModules().remove(module);
            courseRepository.save(course);
        }
        moduleRepository.delete(module);
        return true;
    }

    // Modules of one course. Students see only published modules.
    public List<ModuleResponse> getAllModuleByCourse(Integer courseId) {
        User user = currentUserService.getCurrentUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course Not Found with ID: " + courseId));
        boolean student = currentUserService.isStudent(user);
        if (student && !Boolean.TRUE.equals(course.getPublished())) {
            throw new ResourseNotFoundException("Course Not Found with ID: " + courseId);
        }
        return course.getModules().stream()
                .filter(m -> !student || Boolean.TRUE.equals(m.getPublished()))
                .map(this::makeResponse)
                .toList();
    }

    private void applyRequest(Module module, ModuleRequest moduleRequest, User teacher) {
        module.setTitle(moduleRequest.title().trim());
        module.setDescription(moduleRequest.description());
        module.setPublished(moduleRequest.published());
        // Keeps the lesson order sent by the teacher (saved through @OrderColumn).
        List<Integer> ids = moduleRequest.lessonsIds();
        module.setLessons(OrderUtil.inRequestOrder(lessonRepository.findByIdInAndTeacher(ids, teacher), ids, Lesson::getId, "Lesson"));
    }

    private Module findOwnedModule(Integer id) {
        User user = currentUserService.getCurrentUser();
        Module module = currentUserService.isAdmin(user)
                ? moduleRepository.findById(id).orElse(null)
                : moduleRepository.findByIdAndTeacher(id, user);
        if (module == null) {
            throw new ResourseNotFoundException("Module Not Found with ID: " + id);
        }
        return module;
    }
}

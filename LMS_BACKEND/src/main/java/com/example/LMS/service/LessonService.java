package com.example.LMS.service;

import com.example.LMS.DTO.LessonLibraryResponse;
import com.example.LMS.DTO.LessonRequest;
import com.example.LMS.DTO.LessonUsage;
import com.example.LMS.DTO.LessonResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Course;
import com.example.LMS.model.FilePurpose;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.MediaFile;
import com.example.LMS.model.Module;
import com.example.LMS.model.User;
import com.example.LMS.repository.LessonProgressRepository;
import com.example.LMS.repository.LessonRepository;
import com.example.LMS.repository.ModuleRepository;
import com.example.LMS.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class LessonService {

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private LessonProgressRepository lessonProgressRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private FileService fileService;

    public LessonResponse lessonToResponse(Lesson lesson) {
        // Uploaded files get a fresh link (with a short-lived token) every time the lesson is read.
        String videoUrl = lesson.getVideoFile() != null ? fileService.linkFor(lesson.getVideoFile()) : lesson.getVideoUrl();
        String pdfUrl = lesson.getPdfFile() != null ? fileService.linkFor(lesson.getPdfFile()) : lesson.getPdfUrl();
        return new LessonResponse(lesson.getId(), lesson.getTitle(), videoUrl, pdfUrl,
                lesson.getContent(), lesson.getDuration(), lesson.getType(), lesson.getPublished(),
                lesson.getCreatedAt(), lesson.getUpdatedAt(),
                lesson.getVideoFile() != null ? lesson.getVideoFile().getId() : null,
                lesson.getPdfFile() != null ? lesson.getPdfFile().getId() : null);
    }

    // ownerId: an admin building a teacher's course creates the lesson for that teacher.
    public LessonResponse addLesson(LessonRequest lessonRequest, Integer ownerId) {
        User teacher = ownerFor(ownerId);
        // Titles must be unique per teacher only (two teachers can both have "Introduction").
        if (lessonRepository.findByTitleIgnoreCaseAndTeacher(lessonRequest.title().trim(), teacher) != null) {
            throw new ResourceAlreadyExistException("You already have a lesson with title " + lessonRequest.title());
        }

        Lesson lesson = new Lesson();
        lesson.setTeacher(teacher);
        applyRequest(lesson, lessonRequest);
        return lessonToResponse(lessonRepository.save(lesson));
    }

    // The teacher's own lesson library.
    public List<LessonResponse> getAllLessons() {
        User teacher = currentUserService.getCurrentUser();
        return lessonRepository.findAllByTeacher(teacher).stream().map(this::lessonToResponse).toList();
    }

    // Lesson library page: every lesson with the courses and modules that use it.
    // A teacher sees their own lessons; an admin sees every teacher's lessons.
    @Transactional(readOnly = true)
    public List<LessonLibraryResponse> getLibrary() {
        User user = currentUserService.getCurrentUser();
        List<Lesson> lessons = currentUserService.isAdmin(user) ? lessonRepository.findAll() : lessonRepository.findAllByTeacher(user);
        return lessons.stream()
                .map(lesson -> {
                    List<LessonUsage> usedIn = usageOf(lesson);
                    long courses = usedIn.stream().map(LessonUsage::courseId).filter(Objects::nonNull).distinct().count();
                    return new LessonLibraryResponse(lesson.getId(), lesson.getTitle(), lesson.getType(), lesson.getDuration(),
                            lesson.getPublished(), lesson.getTeacher() != null ? lesson.getTeacher().getId() : null,
                            lesson.getTeacher() != null ? lesson.getTeacher().getName() : null,
                            lesson.getUpdatedAt(), (int) courses, usedIn);
                })
                .toList();
    }

    // Where one lesson is used. The course builder asks this before editing a shared lesson.
    @Transactional(readOnly = true)
    public List<LessonUsage> getUsage(Integer id) {
        Lesson lesson = findLesson(id);
        checkOwner(lesson);
        return usageOf(lesson);
    }

    // "Make a copy for this course only": copies the lesson (same content and files) and, when moduleId is given,
    // swaps the copy in at the same position in that module. Other courses keep the original.
    @Transactional
    public LessonResponse copyLesson(Integer id, Integer moduleId) {
        Lesson original = findLesson(id);
        checkOwner(original);

        Lesson copy = new Lesson();
        copy.setTeacher(original.getTeacher());
        copy.setTitle(freeCopyTitle(original));
        copy.setVideoFile(original.getVideoFile());
        copy.setPdfFile(original.getPdfFile());
        copy.setVideoUrl(original.getVideoUrl());
        copy.setPdfUrl(original.getPdfUrl());
        copy.setContent(original.getContent());
        copy.setDuration(original.getDuration());
        copy.setType(original.getType());
        copy.setPublished(original.getPublished());
        Lesson saved = lessonRepository.save(copy);

        if (moduleId != null) {
            Module module = moduleRepository.findById(moduleId)
                    .orElseThrow(() -> new ResourseNotFoundException("Module with id " + moduleId + " not found"));
            if (!currentUserService.isAdminOrOwner(currentUserService.getCurrentUser(), module.getTeacher())) {
                throw new UnauthorizedAccessException("You are not allowed to change this module");
            }
            int index = module.getLessons().indexOf(original);
            if (index < 0) {
                throw new BadRequestException("This lesson is not in that module");
            }
            module.getLessons().set(index, saved);
            moduleRepository.save(module);
        }
        return lessonToResponse(saved);
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

    private List<LessonUsage> usageOf(Lesson lesson) {
        List<LessonUsage> usage = new ArrayList<>();
        for (Module module : moduleRepository.findByLessonsContaining(lesson)) {
            List<Course> courses = module.getCourse();
            if (courses == null || courses.isEmpty()) {
                usage.add(new LessonUsage(null, null, module.getId(), module.getTitle()));
            } else {
                for (Course course : courses) {
                    usage.add(new LessonUsage(course.getId(), course.getTitle(), module.getId(), module.getTitle()));
                }
            }
        }
        return usage;
    }

    // "Intro (copy)", then "Intro (copy 2)", ... (titles are unique per teacher).
    private String freeCopyTitle(Lesson original) {
        String base = original.getTitle() + " (copy";
        String title = base + ")";
        for (int n = 2; lessonRepository.findByTitleIgnoreCaseAndTeacher(title, original.getTeacher()) != null; n++) {
            title = base + " " + n + ")";
        }
        return title;
    }

    // Owner teacher, admin, or a student enrolled in a course that contains this lesson.
    public LessonResponse getLessonById(Integer id) {
        User user = currentUserService.getCurrentUser();
        Lesson lesson = findLesson(id);
        if (!accessService.canViewLesson(user, lesson)) {
            throw new UnauthorizedAccessException("You are not allowed to view this lesson");
        }
        if (currentUserService.isStudent(user) && !Boolean.TRUE.equals(lesson.getPublished())) {
            throw new ResourseNotFoundException("Lesson with id " + id + " not found");
        }
        return lessonToResponse(lesson);
    }

    public LessonResponse updateLesson(Integer id, LessonRequest lessonRequest) {
        Lesson lesson = findLesson(id);
        checkOwner(lesson);

        Lesson sameTitle = lessonRepository.findByTitleIgnoreCaseAndTeacher(lessonRequest.title().trim(), lesson.getTeacher());
        if (sameTitle != null && !sameTitle.getId().equals(id)) {
            throw new ResourceAlreadyExistException("You already have a lesson with title " + lessonRequest.title());
        }
        applyRequest(lesson, lessonRequest);
        return lessonToResponse(lessonRepository.save(lesson));
    }

    @Transactional
    public Boolean deleteLesson(Integer id) {
        Lesson lesson = findLesson(id);
        checkOwner(lesson);

        // Remove the lesson from every module first, and delete its progress rows,
        // otherwise the database refuses the delete (foreign keys).
        for (Module module : moduleRepository.findByLessonsContaining(lesson)) {
            module.getLessons().remove(lesson);
            moduleRepository.save(module);
        }
        lessonProgressRepository.deleteAll(lessonProgressRepository.findByLesson(lesson));
        lessonRepository.delete(lesson);
        return true;
    }

    // Lessons of one module. Students see only published lessons, and only after enrolling.
    public List<LessonResponse> getLessonsByModuleId(Integer moduleId) {
        User user = currentUserService.getCurrentUser();
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new ResourseNotFoundException("Module with id " + moduleId + " not found"));
        boolean student = currentUserService.isStudent(user);

        return module.getLessons().stream()
                .filter(lesson -> !student || Boolean.TRUE.equals(lesson.getPublished()))
                .map(lesson -> student && !accessService.canViewModule(user, module)
                        ? titleOnly(lesson)
                        : lessonToResponse(lesson))
                .toList();
    }

    // Before enrolling, a student sees the syllabus (titles and length) but not the video, PDF or text.
    private LessonResponse titleOnly(Lesson lesson) {
        return new LessonResponse(lesson.getId(), lesson.getTitle(), null, null, null, lesson.getDuration(),
                lesson.getType(), lesson.getPublished(), lesson.getCreatedAt(), lesson.getUpdatedAt(), null, null);
    }

    private void applyRequest(Lesson lesson, LessonRequest lessonRequest) {
        lesson.setTitle(lessonRequest.title().trim());
        MediaFile video = fileService.requireOwnFile(lessonRequest.videoFileId(), FilePurpose.LESSON_VIDEO);
        MediaFile pdf = fileService.requireOwnFile(lessonRequest.pdfFileId(), FilePurpose.LESSON_PDF);
        lesson.setVideoFile(video);
        lesson.setPdfFile(pdf);
        lesson.setVideoUrl(video != null ? null : lessonRequest.videoUrl());
        lesson.setPdfUrl(pdf != null ? null : lessonRequest.pdfUrl());
        lesson.setContent(lessonRequest.content());
        lesson.setPublished(Boolean.TRUE.equals(lessonRequest.published()));
        lesson.setDuration(lessonRequest.duration());
        lesson.setType(lessonRequest.contentType());
    }

    private Lesson findLesson(Integer id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Lesson with id " + id + " not found"));
    }

    private void checkOwner(Lesson lesson) {
        if (!currentUserService.isAdminOrOwner(currentUserService.getCurrentUser(), lesson.getTeacher())) {
            throw new UnauthorizedAccessException("You are not allowed to change this lesson");
        }
    }
}

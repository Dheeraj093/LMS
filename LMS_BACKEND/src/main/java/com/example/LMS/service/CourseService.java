package com.example.LMS.service;

import com.example.LMS.DTO.CourseRequest;
import com.example.LMS.DTO.CourseResponse;
import com.example.LMS.DTO.CourseStructureRequest;
import com.example.LMS.DTO.CurriculumResponse;
import com.example.LMS.DTO.LessonProgressResponse;
import com.example.LMS.DTO.PageResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.Category;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.FilePurpose;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.MediaFile;
import com.example.LMS.model.Module;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.User;
import com.example.LMS.repository.AssignmentRepositry;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.CategoryRepository;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.LessonRepository;
import com.example.LMS.repository.ModuleRepository;
import com.example.LMS.repository.QuizRepositry;
import com.example.LMS.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class CourseService {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private QuizRepositry quizRepositry;

    @Autowired
    private AssignmentRepositry assignmentRepositry;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private LessonProgressService lessonProgressService;

    @Autowired
    private FileService fileService;

    @Autowired
    private CurrentUserService currentUserService;

    public CourseResponse makeResponse(Course course) {
        List<Integer> moduleIds = new ArrayList<>();
        if (course.getModules() != null) {
            for (Module module : course.getModules()) {
                if (module != null) {
                    moduleIds.add(module.getId());
                }
            }
        }
        Category category = course.getCategory();
        User teacher = course.getTeacher();
        Double avg = reviewRepository.averageRating(course);
        return new CourseResponse(course.getId(), course.getTitle(), course.getDescription(), course.getThumbnail(),
                category != null ? category.getId() : null,
                category != null ? category.getName() : null,
                moduleIds, course.getPublished(),
                teacher != null ? teacher.getId() : null,
                teacher != null ? teacher.getName() : null,
                avg == null ? null : Math.round(avg * 10) / 10.0,
                reviewRepository.countByCourse(course),
                enrollmentRepository.countByCourse(course));
    }

    public CourseResponse addCourse(CourseRequest courseRequest) {
        User teacher = currentUserService.getCurrentUser();

        if (courseRepository.findByTitleIgnoreCaseAndTeacher(courseRequest.title().trim(), teacher) != null) {
            throw new ResourceAlreadyExistException("You already have a course with title: " + courseRequest.title());
        }

        Course course = new Course();
        course.setTeacher(teacher);
        applyRequest(course, courseRequest, teacher);
        return makeResponse(courseRepository.save(course));
    }

    // Teacher: own courses. Admin: every course.
    public List<CourseResponse> getAllCourses() {
        User user = currentUserService.getCurrentUser();
        List<Course> courseList = currentUserService.isAdmin(user)
                ? courseRepository.findAll()
                : courseRepository.findByTeacher(user);
        return courseList.stream().map(this::makeResponse).toList();
    }

    public CourseResponse getCourseById(Integer id) {
        return makeResponse(findOwnedCourse(id));
    }

    // Catalog for students as a plain list (what the current frontend expects), with optional filters.
    public List<CourseResponse> getPublishedCourses(String search, Integer categoryId) {
        return courseRepository.searchPublished(like(search), categoryId, PageRequest.of(0, 500, Sort.by("title")))
                .map(this::makeResponse).getContent();
    }

    // Same catalog, one page at a time (for a big catalog).
    public PageResponse<CourseResponse> getCatalogPage(String search, Integer categoryId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return PageResponse.of(courseRepository.searchPublished(like(search), categoryId,
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by("title"))), this::makeResponse);
    }

    public CourseResponse getPublishedCourseById(Integer id) {
        Course course = courseRepository.findByIdAndPublishedTrue(id);
        if (course == null) {
            throw new ResourseNotFoundException("Course with id " + id + " not found");
        }
        return makeResponse(course);
    }

    // Modules and lessons in builder order, plus the student's progress, in one call.
    public CurriculumResponse getCurriculum(Integer id) {
        User user = currentUserService.getCurrentUser();
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Course with id " + id + " not found"));
        boolean owner = currentUserService.isAdminOrOwner(user, course.getTeacher());
        if (!owner && !Boolean.TRUE.equals(course.getPublished())) {
            throw new ResourseNotFoundException("Course with id " + id + " not found");
        }
        Enrollment enrollment = enrollmentRepository.findByStudentAndCourse(user, course);
        boolean enrolled = enrollment != null;

        LessonProgressResponse progress = enrolled ? lessonProgressService.progressOf(user, course) : null;
        Set<Integer> completed = progress == null ? Set.of() : new HashSet<>(progress.completedLessonIds());

        List<CurriculumResponse.ModuleItem> modules = new ArrayList<>();
        if (course.getModules() != null) {
            for (Module module : course.getModules()) {
                if (module == null || (!owner && !Boolean.TRUE.equals(module.getPublished()))) {
                    continue;
                }
                List<CurriculumResponse.LessonItem> lessons = new ArrayList<>();
                if (module.getLessons() != null) {
                    for (Lesson lesson : module.getLessons()) {
                        if (lesson == null || (!owner && !Boolean.TRUE.equals(lesson.getPublished()))) {
                            continue;
                        }
                        lessons.add(new CurriculumResponse.LessonItem(lesson.getId(), lesson.getTitle(), lesson.getType(),
                                lesson.getDuration(), lesson.getPublished(), completed.contains(lesson.getId()),
                                !owner && !enrolled));
                    }
                }
                modules.add(new CurriculumResponse.ModuleItem(module.getId(), module.getTitle(), module.getDescription(),
                        module.getPublished(), lessons));
            }
        }
        return new CurriculumResponse(makeResponse(course), enrolled,
                enrollment != null ? enrollment.getCompletedAt() : null, progress, modules);
    }

    // Saves the whole course builder tree at once: module order, and lesson order inside each module.
    @Transactional
    public CurriculumResponse updateStructure(Integer id, CourseStructureRequest request) {
        Course course = findOwnedCourse(id);
        User owner = course.getTeacher();

        List<Integer> moduleIds = request.modules().stream().map(CourseStructureRequest.ModuleOrder::moduleId).toList();
        List<Module> modules = OrderUtil.inRequestOrder(moduleRepository.findByIdInAndTeacher(moduleIds, owner),
                moduleIds, Module::getId, "Module");

        for (int i = 0; i < modules.size(); i++) {
            Module module = modules.get(i);
            List<Integer> lessonIds = request.modules().get(i).lessonIds();
            module.setLessons(OrderUtil.inRequestOrder(lessonRepository.findByIdInAndTeacher(lessonIds, owner),
                    lessonIds, Lesson::getId, "Lesson"));
            moduleRepository.save(module);
        }
        course.setModules(new ArrayList<>(modules));
        courseRepository.save(course);
        return getCurriculum(id);
    }

    public CourseResponse updateCourse(Integer id, CourseRequest courseRequest) {
        User teacher = currentUserService.getCurrentUser();
        Course course = findOwnedCourse(id);

        Course sameTitle = courseRepository.findByTitleIgnoreCaseAndTeacher(courseRequest.title().trim(), course.getTeacher());
        if (sameTitle != null && !sameTitle.getId().equals(id)) {
            throw new ResourceAlreadyExistException("You already have a course with title: " + courseRequest.title());
        }
        applyRequest(course, courseRequest, course.getTeacher() != null ? course.getTeacher() : teacher);
        return makeResponse(courseRepository.save(course));
    }

    @Transactional
    public Boolean deleteCourse(Integer id) {
        Course course = findOwnedCourse(id);

        // Deleting a course that students joined would erase their progress. Unpublish it instead.
        if (enrollmentRepository.existsByCourse(course)) {
            throw new ResourceAlreadyExistException("Students are enrolled in this course. Unpublish it instead of deleting");
        }
        List<Assignment> assignments = assignmentRepositry.findByCourse(course);
        for (Assignment assignment : assignments) {
            if (assignmentSubmissionRepository.existsByAssignment(assignment)) {
                throw new ResourceAlreadyExistException("This course has assignment submissions. Unpublish it instead of deleting");
            }
        }
        assignmentRepositry.deleteAll(assignments);
        // Quizzes stay in the teacher's library, just without a course.
        for (Quiz quiz : quizRepositry.findByCourse(course)) {
            quiz.setCourse(null);
            quizRepositry.save(quiz);
        }
        courseRepository.delete(course);
        return true;
    }

    private void applyRequest(Course course, CourseRequest courseRequest, User teacher) {
        Category category = categoryRepository.findById(courseRequest.categoryId())
                .orElseThrow(() -> new ResourseNotFoundException("Category with id " + courseRequest.categoryId() + " not found"));
        course.setTitle(courseRequest.title().trim());
        course.setDescription(courseRequest.description());
        MediaFile thumbnailFile = fileService.requireOwnFile(courseRequest.thumbnailFileId(), FilePurpose.COURSE_THUMBNAIL);
        course.setThumbnail(thumbnailFile != null ? fileService.linkFor(thumbnailFile) : courseRequest.thumbnail());
        course.setCategory(category);
        // Keeps the module order the teacher sent (saved through @OrderColumn).
        List<Integer> moduleIds = courseRequest.modules() == null ? List.of() : courseRequest.modules();
        course.setModules(new ArrayList<>(OrderUtil.inRequestOrder(moduleRepository.findByIdInAndTeacher(moduleIds, teacher),
                moduleIds, Module::getId, "Module")));
        course.setPublished(courseRequest.published());
    }

    // The course must belong to the logged-in teacher (an admin can open any course).
    private Course findOwnedCourse(Integer id) {
        User user = currentUserService.getCurrentUser();
        Course course = currentUserService.isAdmin(user)
                ? courseRepository.findById(id).orElse(null)
                : courseRepository.findByIdAndTeacher(id, user);
        if (course == null) {
            throw new ResourseNotFoundException("Course with id " + id + " not found");
        }
        return course;
    }

    // "java" -> "%java%" for a case-insensitive LIKE search; empty -> no filter.
    private String like(String search) {
        return search == null || search.isBlank() ? null : "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
    }
}

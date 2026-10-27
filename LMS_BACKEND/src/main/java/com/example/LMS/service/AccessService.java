package com.example.LMS.service;

import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.Audience;
import com.example.LMS.model.Course;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.Module;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.ModuleRepository;
import com.example.LMS.repository.QuizJoinRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

// Shared "who may see what" checks, so every service applies the same rules:
// - an admin can see everything
// - a teacher can see what they created
// - a student can see a course's content only after enrolling
// - a quiz or assignment limited to groups is seen only by students in those groups
@Service
public class AccessService {

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private QuizJoinRepository quizJoinRepository;

    public boolean isEnrolled(User student, Course course) {
        return enrollmentRepository.existsByStudentAndCourse(student, course);
    }

    public boolean canViewCourseContent(User user, Course course) {
        return currentUserService.isAdminOrOwner(user, course.getTeacher()) || isEnrolled(user, course);
    }

    public void checkCanViewCourseContent(User user, Course course) {
        if (!canViewCourseContent(user, course)) {
            throw new UnauthorizedAccessException("Enroll in this course to see its content");
        }
    }

    public void checkCourseOwner(User user, Course course) {
        if (!currentUserService.isAdminOrOwner(user, course.getTeacher())) {
            throw new UnauthorizedAccessException("Only the course teacher can do this");
        }
    }

    // A lesson can be reused in many modules, and a module in many courses.
    public Set<Course> coursesOfLesson(Lesson lesson) {
        Set<Course> courses = new LinkedHashSet<>();
        for (Module module : moduleRepository.findByLessonsContaining(lesson)) {
            courses.addAll(courseRepository.findByModulesContaining(module));
        }
        return courses;
    }

    public boolean canViewLesson(User user, Lesson lesson) {
        if (currentUserService.isAdminOrOwner(user, lesson.getTeacher())) {
            return true;
        }
        for (Course course : coursesOfLesson(lesson)) {
            if (canViewCourseContent(user, course)) {
                return true;
            }
        }
        return false;
    }

    // Every lesson of a course in the order of the course builder, each lesson once.
    // publishedOnly = true is what students see (and what progress is counted on).
    public List<Lesson> lessonsOfCourse(Course course, boolean publishedOnly) {
        Set<Lesson> lessons = new LinkedHashSet<>();
        if (course.getModules() != null) {
            for (Module module : course.getModules()) {
                if (module == null || (publishedOnly && !Boolean.TRUE.equals(module.getPublished()))) {
                    continue;
                }
                if (module.getLessons() != null) {
                    for (Lesson lesson : module.getLessons()) {
                        if (lesson != null && (!publishedOnly || Boolean.TRUE.equals(lesson.getPublished()))) {
                            lessons.add(lesson);
                        }
                    }
                }
            }
        }
        return new ArrayList<>(lessons);
    }

    public boolean canViewModule(User user, Module module) {
        if (currentUserService.isAdminOrOwner(user, module.getTeacher())) {
            return true;
        }
        List<Course> courses = courseRepository.findByModulesContaining(module);
        return courses.stream().anyMatch(c -> canViewCourseContent(user, c));
    }

    // Old rows have no audience saved; they mean ALL.
    public static Audience audienceOf(Audience audience) {
        return audience == null ? Audience.ALL : audience;
    }

    public boolean inAnyGroup(User student, List<StudentGroup> groups) {
        if (groups == null) {
            return false;
        }
        return groups.stream().anyMatch(g -> g.getMembers() != null
                && g.getMembers().stream().anyMatch(m -> m.getId().equals(student.getId())));
    }

    // Course teacher/admin always. A student must be enrolled, and for GROUPS also be in one of the groups.
    public boolean canSeeAssignment(User user, Assignment assignment) {
        if (currentUserService.isAdminOrOwner(user, assignment.getCourse().getTeacher())) {
            return true;
        }
        if (!isEnrolled(user, assignment.getCourse())) {
            return false;
        }
        return audienceOf(assignment.getAudience()) != Audience.GROUPS || inAnyGroup(user, assignment.getGroups());
    }

    // May this student open and take the quiz? (The quiz owner and admins are checked by the caller.)
    public boolean canTakeQuiz(User student, Quiz quiz) {
        if (!Boolean.TRUE.equals(quiz.getPublished())) {
            return false;
        }
        return switch (audienceOf(quiz.getAudience())) {
            case ALL -> quiz.getCourse() != null && isEnrolled(student, quiz.getCourse());
            case GROUPS -> (quiz.getCourse() == null || isEnrolled(student, quiz.getCourse()))
                    && inAnyGroup(student, quiz.getGroups());
            case LINK -> quizJoinRepository.existsByQuizAndStudent(quiz, student);
        };
    }

    // The reason shown when canTakeQuiz says no.
    public String whyCannotTakeQuiz(Quiz quiz) {
        return switch (audienceOf(quiz.getAudience())) {
            case ALL -> "Enroll in this course to take the quiz";
            case GROUPS -> "This quiz is only for selected groups";
            case LINK -> "Open this quiz with its join code first";
        };
    }
}

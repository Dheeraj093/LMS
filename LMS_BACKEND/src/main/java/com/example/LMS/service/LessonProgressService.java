package com.example.LMS.service;

import com.example.LMS.DTO.LessonProgressRequest;
import com.example.LMS.DTO.LessonProgressResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.Lesson;
import com.example.LMS.model.LessonProgress;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.LessonProgressRepository;
import com.example.LMS.repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LessonProgressService {

    @Autowired
    private LessonProgressRepository lessonProgressRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private AccessService accessService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private CertificateService certificateService;

    @Autowired
    private NotificationService notificationService;

    // Old endpoint body: { lessonId }.
    public Boolean addLessonProgress(LessonProgressRequest lessonProgressRequest) {
        completeLesson(lessonProgressRequest.lessonId());
        return true;
    }

    // Marks a lesson as completed for the logged-in student.
    // If that was the last lesson of a course, the course is marked complete and a certificate is issued.
    @Transactional
    public LessonProgressResponse completeLesson(Integer lessonId) {
        User student = currentUserService.getCurrentUser();
        Lesson lesson = findLesson(lessonId);
        List<Course> enrolledCourses = enrolledCoursesWith(student, lesson);

        // Clicking "complete" twice used to create duplicate rows. Now it updates the same row.
        LessonProgress progress = progressRow(student, lesson);
        if (!Boolean.TRUE.equals(progress.getCompleted())) {
            progress.setCompleted(true);
            progress.setCompletedAt(LocalDateTime.now());
            lessonProgressRepository.save(progress);
        }

        for (Course course : enrolledCourses) {
            checkCourseCompleted(student, course);
        }
        return progressOf(student, enrolledCourses.get(0));
    }

    // Adds study time to the lesson and to today's activity (for the "minutes per day" chart).
    @Transactional
    public void addStudyTime(Integer lessonId, int seconds) {
        User student = currentUserService.getCurrentUser();
        Lesson lesson = findLesson(lessonId);
        enrolledCoursesWith(student, lesson);

        LessonProgress progress = progressRow(student, lesson);
        progress.setTimeSpentSeconds((progress.getTimeSpentSeconds() == null ? 0 : progress.getTimeSpentSeconds()) + seconds);
        lessonProgressRepository.save(progress);
        activityService.addStudySeconds(student, seconds);
    }

    // Progress of the logged-in student in one course.
    public LessonProgressResponse getLessonProgress(Integer courseId) {
        User student = currentUserService.getCurrentUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course Not Found with ID: " + courseId));
        return progressOf(student, course);
    }

    // Counted on published lessons only (what the student can actually see), each lesson once.
    public LessonProgressResponse progressOf(User student, Course course) {
        List<Lesson> lessons = accessService.lessonsOfCourse(course, true);
        Set<Integer> lessonIds = lessons.stream().map(Lesson::getId).collect(Collectors.toSet());
        List<Integer> completedIds = lessonIds.isEmpty() ? List.of()
                : lessonProgressRepository.completedLessonIds(student, lessonIds);
        int total = lessonIds.size();
        // A course with no lessons returns 0, not NaN (0 / 0).
        double fraction = total == 0 ? 0.0 : (double) completedIds.size() / total;
        return new LessonProgressResponse(total, completedIds.size(), fraction, completedIds);
    }

    private void checkCourseCompleted(User student, Course course) {
        LessonProgressResponse progress = progressOf(student, course);
        if (progress.totalLessons() == 0 || progress.completedLessons() < progress.totalLessons()) {
            return;
        }
        Enrollment enrollment = enrollmentRepository.findByStudentAndCourse(student, course);
        if (enrollment != null && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(LocalDateTime.now());
            enrollmentRepository.save(enrollment);
            certificateService.issue(student, course);
            notificationService.notify(student, NotificationType.COURSE_COMPLETED,
                    "You completed " + course.getTitle() + ". Your certificate is ready.", "/student/certificates");
        }
    }

    // The student must be enrolled in a course that contains this lesson.
    private List<Course> enrolledCoursesWith(User student, Lesson lesson) {
        List<Course> courses = accessService.coursesOfLesson(lesson).stream()
                .filter(course -> accessService.isEnrolled(student, course))
                .toList();
        if (courses.isEmpty()) {
            throw new UnauthorizedAccessException("Enroll in the course before studying its lessons");
        }
        return courses;
    }

    private LessonProgress progressRow(User student, Lesson lesson) {
        LessonProgress progress = lessonProgressRepository.findByStudentAndLesson(student, lesson);
        if (progress == null) {
            progress = new LessonProgress();
            progress.setStudent(student);
            progress.setLesson(lesson);
            progress.setCompleted(false);
            progress.setTimeSpentSeconds(0);
        }
        return progress;
    }

    private Lesson findLesson(Integer lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourseNotFoundException("Lesson Not Found with ID: " + lessonId));
    }
}

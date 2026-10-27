package com.example.LMS.service;

import com.example.LMS.DTO.EnrollmentRequest;
import com.example.LMS.DTO.EnrollmentResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.User;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import com.example.LMS.repository.UserRepository;
import com.example.LMS.DTO.CourseStudentResponse;
import com.example.LMS.DTO.LessonProgressResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class EnrollmentService {

    @Autowired
    private LessonProgressService lessonProgressService;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private AccessService accessService;

    @Autowired
    private NotificationService notificationService;

    private EnrollmentResponse toResponse(Enrollment enrollment) {
        return new EnrollmentResponse(enrollment.getId(), enrollment.getCourse().getId(), enrollment.getStudent().getId(),
                enrollment.getCourse().getTitle(), enrollment.getEnrolledDate());
    }

    public EnrollmentResponse addEnrollment(EnrollmentRequest enrollmentRequest) {
        // The student is whoever is logged in, never a studentId from the request.
        User student = currentUserService.getCurrentUser();

        Course course = courseRepository.findById(enrollmentRequest.courseId())
                .orElseThrow(() -> new ResourseNotFoundException("Course Not Found with Id: " + enrollmentRequest.courseId()));
        if (!Boolean.TRUE.equals(course.getPublished())) {
            throw new BadRequestException("This course is not published yet");
        }

        // Bug fix: was findByStudentAndStudent(student, course).
        if (enrollmentRepository.existsByStudentAndCourse(student, course)) {
            throw new ResourceAlreadyExistException("You are already enrolled in course: " + course.getTitle());
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setCourse(course);
        enrollment.setEnrolledDate(LocalDate.now());
        Enrollment saved = enrollmentRepository.save(enrollment);
        notificationService.notify(course.getTeacher(), NotificationType.NEW_ENROLLMENT,
                student.getName() + " joined " + course.getTitle(), "/courses/" + course.getId());
        return toResponse(saved);
    }

    // A student can see only their own enrollments; teachers and admins can see any student's.
    public List<EnrollmentResponse> getEnrollmentByStudentId(Integer studentId) {
        User user = currentUserService.getCurrentUser();
        if (currentUserService.isStudent(user) && !user.getId().equals(studentId)) {
            throw new UnauthorizedAccessException("You can only see your own enrollments");
        }
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourseNotFoundException("Student Not Found with Id: " + studentId));
        return enrollmentRepository.findByStudent(student).stream().map(this::toResponse).toList();
    }

    public List<EnrollmentResponse> getMyEnrollments() {
        User student = currentUserService.getCurrentUser();
        return enrollmentRepository.findByStudent(student).stream().map(this::toResponse).toList();
    }

    // Only the course teacher (or an admin) can list who joined a course.
    // Teacher "Students" tab: every enrolled student with name, email and progress in one call.
    public List<CourseStudentResponse> getCourseStudents(Integer courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course Not Found with Id: " + courseId));
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), course);
        return enrollmentRepository.findByCourse(course).stream().map(e -> {
            User s = e.getStudent();
            LessonProgressResponse p = lessonProgressService.progressOf(s, course);
            double pct = p.completionPercentage() == null ? 0 : Math.round(p.completionPercentage() * 1000) / 10.0;
            return new CourseStudentResponse(s.getId(), s.getName(), s.getEmail(), s.getAvatarUrl(), e.getEnrolledDate(),
                    p.completedLessons(), p.totalLessons(), pct, e.getCompletedAt(), s.getLastActiveAt());
        }).toList();
    }

    public List<EnrollmentResponse> getEnrollmentByCourseId(Integer courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course Not Found with Id: " + courseId));
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), course);
        return enrollmentRepository.findByCourse(course).stream().map(this::toResponse).toList();
    }
}

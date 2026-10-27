package com.example.LMS.service;

import com.example.LMS.DTO.AssignmentRequest;
import com.example.LMS.DTO.AssignmentResponse;
import com.example.LMS.DTO.MyAssignmentResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.AssignmentSubmission;
import com.example.LMS.model.Audience;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.Course;
import com.example.LMS.model.Enrollment;
import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import com.example.LMS.repository.AssignmentRepositry;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.CourseRepository;
import com.example.LMS.repository.EnrollmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class AssignmentService {

    @Autowired
    AssignmentRepositry assignmentRepositry;

    @Autowired
    AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    CourseRepository courseRepository;

    @Autowired
    EnrollmentRepository enrollmentRepository;

    @Autowired
    AccessService accessService;

    @Autowired
    NotificationService notificationService;

    @Autowired
    CurrentUserService currentUserService;

    @Autowired
    GroupService groupService;

    public AssignmentResponse toResponse(Assignment assignment) {
        return new AssignmentResponse(assignment.getId(), assignment.getTitle(), assignment.getDescription(),
                assignment.getDueDate(), assignment.getTotalMarks(),
                assignment.getCourse() != null ? assignment.getCourse().getId() : null,
                AccessService.audienceOf(assignment.getAudience()),
                assignment.getGroups() == null ? List.of() : assignment.getGroups().stream().map(StudentGroup::getId).toList());
    }

    public AssignmentResponse createAssignment(AssignmentRequest assignmentRequest) {
        Course course = findCourse(assignmentRequest.courseId());
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), course);

        if (assignmentRepositry.findByTitleIgnoreCaseAndCourse(assignmentRequest.title().trim(), course) != null) {
            throw new ResourceAlreadyExistException("Assignment with title " + assignmentRequest.title() + " already exists in this course");
        }
        Assignment assignment = new Assignment();
        applyRequest(assignment, assignmentRequest, course);
        Assignment saved = assignmentRepositry.save(assignment);
        // Tell every enrolled student it is meant for.
        for (Enrollment enrollment : enrollmentRepository.findByCourse(course)) {
            if (!accessService.canSeeAssignment(enrollment.getStudent(), saved)) {
                continue;
            }
            notificationService.notify(enrollment.getStudent(), NotificationType.NEW_ASSIGNMENT,
                    "New assignment in " + course.getTitle() + ": " + saved.getTitle(), "/student/assignments/" + saved.getId());
        }
        return toResponse(saved);
    }

    // Admin: all. Teacher: assignments of own courses. Student: assignments of joined courses.
    // Before, everyone got every assignment of every course.
    public List<AssignmentResponse> getAllAssignment() {
        User user = currentUserService.getCurrentUser();
        List<Assignment> assignments;
        if (currentUserService.isAdmin(user)) {
            assignments = assignmentRepositry.findAll();
        } else if (currentUserService.isTeacher(user)) {
            assignments = assignmentRepositry.findByCourseIn(courseRepository.findByTeacher(user));
        } else {
            List<Course> joined = enrollmentRepository.findByStudent(user).stream().map(Enrollment::getCourse).toList();
            assignments = assignmentRepositry.findByCourseIn(joined).stream()
                    .filter(a -> accessService.canSeeAssignment(user, a)).toList();
        }
        return assignments.stream().map(this::toResponse).toList();
    }

    // Student view: assignments of joined courses with my own status, nearest due date first.
    public List<MyAssignmentResponse> getMyAssignments() {
        User student = currentUserService.getCurrentUser();
        List<Course> joined = enrollmentRepository.findByStudent(student).stream().map(Enrollment::getCourse).toList();
        LocalDateTime now = LocalDateTime.now();
        return assignmentRepositry.findByCourseIn(joined).stream()
                .filter(a -> accessService.canSeeAssignment(student, a))
                .sorted(Comparator.comparing(Assignment::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(a -> {
                    AssignmentSubmission s = assignmentSubmissionRepository.findByAssignmentAndStudent(a, student);
                    String status;
                    if (s == null) {
                        status = a.getDueDate() != null && now.isAfter(a.getDueDate()) ? "MISSING" : "PENDING";
                    } else if (s.getMarks() != null) {
                        status = "GRADED";
                    } else {
                        status = Boolean.TRUE.equals(s.getLate()) ? "LATE" : "SUBMITTED";
                    }
                    return new MyAssignmentResponse(a.getId(), a.getTitle(), a.getDescription(), a.getDueDate(),
                            a.getTotalMarks(), a.getCourse().getId(), a.getCourse().getTitle(), status,
                            s != null ? s.getId() : null, s != null ? s.getSubmittedAt() : null,
                            s != null ? s.getMarks() : null, s != null ? s.getFeedback() : null);
                })
                .toList();
    }

    public AssignmentResponse getAssignmentById(Integer id) {
        Assignment assignment = findAssignment(id);
        User user = currentUserService.getCurrentUser();
        accessService.checkCanViewCourseContent(user, assignment.getCourse());
        if (!accessService.canSeeAssignment(user, assignment)) {
            throw new UnauthorizedAccessException("This assignment is only for selected groups");
        }
        return toResponse(assignment);
    }

    public List<AssignmentResponse> getAssignmentsByCourse(Integer courseId) {
        Course course = findCourse(courseId);
        User user = currentUserService.getCurrentUser();
        accessService.checkCanViewCourseContent(user, course);
        return assignmentRepositry.findByCourse(course).stream()
                .filter(a -> accessService.canSeeAssignment(user, a))
                .map(this::toResponse).toList();
    }

    public AssignmentResponse updateAssignment(Integer id, AssignmentRequest assignmentRequest) {
        User user = currentUserService.getCurrentUser();
        Assignment assignment = findAssignment(id);
        accessService.checkCourseOwner(user, assignment.getCourse());

        Course course = findCourse(assignmentRequest.courseId());
        accessService.checkCourseOwner(user, course);

        Assignment sameTitle = assignmentRepositry.findByTitleIgnoreCaseAndCourse(assignmentRequest.title().trim(), course);
        if (sameTitle != null && !sameTitle.getId().equals(id)) {
            throw new ResourceAlreadyExistException("Assignment with title " + assignmentRequest.title() + " already exists in this course");
        }
        // Before, this built a "new Assignment()" and saved it, so every edit created a copy.
        applyRequest(assignment, assignmentRequest, course);
        return toResponse(assignmentRepositry.save(assignment));
    }

    public Boolean deleteAssignment(Integer id) {
        Assignment assignment = findAssignment(id);
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), assignment.getCourse());
        if (assignmentSubmissionRepository.existsByAssignment(assignment)) {
            throw new ResourceAlreadyExistException("Students already submitted this assignment, so it cannot be deleted");
        }
        assignmentRepositry.delete(assignment);
        return true;
    }

    public Assignment findAssignment(Integer id) {
        return assignmentRepositry.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Assignment not found with id " + id));
    }

    private Course findCourse(Integer courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourseNotFoundException("Course not found with id " + courseId));
    }

    private void applyRequest(Assignment assignment, AssignmentRequest request, Course course) {
        assignment.setTitle(request.title().trim());
        assignment.setDescription(request.description());
        assignment.setDueDate(request.dueDate());
        assignment.setTotalMarks(request.totalMarks());
        assignment.setCourse(course);

        Audience audience = AccessService.audienceOf(request.audience());
        if (audience == Audience.LINK) {
            throw new BadRequestException("Assignments can be for everyone enrolled (ALL) or for groups (GROUPS)");
        }
        // Groups must belong to the course teacher.
        List<StudentGroup> groups = audience == Audience.GROUPS
                ? groupService.resolveGroups(request.groupIds(), course.getTeacher())
                : new ArrayList<>();
        if (audience == Audience.GROUPS && groups.isEmpty()) {
            throw new BadRequestException("Pick at least one group, or choose everyone enrolled");
        }
        assignment.setAudience(audience);
        if (assignment.getGroups() == null) {
            assignment.setGroups(new ArrayList<>());
        }
        assignment.getGroups().clear();
        assignment.getGroups().addAll(groups);
    }
}

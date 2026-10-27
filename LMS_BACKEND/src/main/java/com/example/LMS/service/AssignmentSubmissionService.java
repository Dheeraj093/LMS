package com.example.LMS.service;

import com.example.LMS.DTO.AssignmentSubmissionRequest;
import com.example.LMS.DTO.AssignmentSubmissionResponse;
import com.example.LMS.DTO.FileResponse;
import com.example.LMS.DTO.GradeRequest;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.AssignmentSubmission;
import com.example.LMS.model.FilePurpose;
import com.example.LMS.model.MediaFile;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.SubmissionStatus;
import com.example.LMS.model.User;
import com.example.LMS.repository.AssignmentSubmissionRepository;
import com.example.LMS.repository.UserRepository;
import com.example.LMS.DTO.StudentSummary;
import com.example.LMS.model.Enrollment;
import com.example.LMS.repository.EnrollmentRepository;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AssignmentSubmissionService {

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccessService accessService;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CurrentUserService currentUserService;

    public AssignmentSubmissionResponse toResponse(AssignmentSubmission s) {
        List<FileResponse> files = s.getFiles() == null ? List.of() : s.getFiles().stream().map(fileService::toResponse).toList();
        return new AssignmentSubmissionResponse(s.getId(), s.getAssignment().getId(), s.getStudent().getId(),
                s.getStudent().getName(), s.getFilePath(), s.getSubmittedAt(), s.getLate(), s.getMarks(), s.getFeedback(),
                s.getStatus(), s.getGradedAt(), files);
    }

    // One submission per student per assignment. Submitting again replaces the file until it is graded.
    public AssignmentSubmissionResponse createAssignmentSubmission(AssignmentSubmissionRequest request) {
        User student = currentUserService.getCurrentUser();
        Assignment assignment = assignmentService.findAssignment(request.assignmentId());

        if (!accessService.isEnrolled(student, assignment.getCourse())) {
            throw new UnauthorizedAccessException("Enroll in this course to submit the assignment");
        }
        if (!accessService.canSeeAssignment(student, assignment)) {
            throw new UnauthorizedAccessException("This assignment is only for selected groups");
        }

        AssignmentSubmission submission = assignmentSubmissionRepository.findByAssignmentAndStudent(assignment, student);
        if (submission == null) {
            submission = new AssignmentSubmission();
            submission.setAssignment(assignment);
            submission.setStudent(student);
        } else if (submission.getMarks() != null) {
            throw new BadRequestException("This submission is already graded, so it cannot be changed");
        }

        List<MediaFile> files = fileService.requireOwnFiles(request.fileIds(), FilePurpose.ASSIGNMENT_FILE);
        String link = request.filePath() == null || request.filePath().isBlank() ? null : request.filePath().trim();
        if (link == null && files.isEmpty()) {
            throw new BadRequestException("Add a file or a link before submitting");
        }

        LocalDateTime now = LocalDateTime.now();
        boolean isNew = submission.getId() == null;
        submission.setFilePath(link);
        submission.setFiles(new ArrayList<>(files));
        submission.setStatus(SubmissionStatus.SUBMITTED);
        submission.setSubmittedAt(now);
        submission.setLate(assignment.getDueDate() != null && now.isAfter(assignment.getDueDate()));
        AssignmentSubmission saved = assignmentSubmissionRepository.save(submission);
        if (isNew) {
            notificationService.notify(assignment.getCourse().getTeacher(), NotificationType.SUBMISSION_RECEIVED,
                    student.getName() + " submitted " + assignment.getTitle(), "/assignments/" + assignment.getId() + "/submissions");
        }
        return toResponse(saved);
    }

    // id = submission id. The student who submitted it, the course teacher, or an admin can read it.
    public AssignmentSubmissionResponse getAssignmentSubmissionById(Integer id) {
        AssignmentSubmission submission = findSubmission(id);
        checkCanView(currentUserService.getCurrentUser(), submission.getAssignment(), submission.getStudent());
        return toResponse(submission);
    }

    // id = assignment id (that is how the frontend calls it). Before, it was looked up as a submission id,
    // so students always saw "not submitted" or someone else's row.
    public AssignmentSubmissionResponse getAssignmentSubmissionByStudentId(Integer assignmentId, Integer studentId) {
        Assignment assignment = assignmentService.findAssignment(assignmentId);
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourseNotFoundException("student not found with id: " + studentId));
        checkCanView(currentUserService.getCurrentUser(), assignment, student);

        AssignmentSubmission submission = assignmentSubmissionRepository.findByAssignmentAndStudent(assignment, student);
        if (submission == null) {
            throw new ResourseNotFoundException("No submission yet for assignment " + assignmentId);
        }
        return toResponse(submission);
    }

    public AssignmentSubmissionResponse getMySubmission(Integer assignmentId) {
        User student = currentUserService.getCurrentUser();
        return getAssignmentSubmissionByStudentId(assignmentId, student.getId());
    }

    // Teacher view: every submission of one assignment.
    public List<AssignmentSubmissionResponse> getSubmissionsByAssignment(Integer assignmentId) {
        Assignment assignment = assignmentService.findAssignment(assignmentId);
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), assignment.getCourse());
        return assignmentSubmissionRepository.findByAssignment(assignment).stream().map(this::toResponse).toList();
    }

    // Teacher view: students who can see this assignment (enrolled, and in its audience) but have not submitted.
    public List<StudentSummary> getMissingStudents(Integer assignmentId) {
        Assignment assignment = assignmentService.findAssignment(assignmentId);
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), assignment.getCourse());
        Set<Integer> submitted = assignmentSubmissionRepository.findByAssignment(assignment).stream()
                .map(s -> s.getStudent().getId()).collect(Collectors.toSet());
        return enrollmentRepository.findByCourse(assignment.getCourse()).stream()
                .map(Enrollment::getStudent)
                .filter(student -> !submitted.contains(student.getId()))
                .filter(student -> accessService.canSeeAssignment(student, assignment))
                .map(u -> new StudentSummary(u.getId(), u.getName(), u.getEmail(), u.getAvatarUrl()))
                .toList();
    }

    public AssignmentSubmissionResponse gradeSubmission(Integer id, GradeRequest request) {
        AssignmentSubmission submission = findSubmission(id);
        Assignment assignment = submission.getAssignment();
        accessService.checkCourseOwner(currentUserService.getCurrentUser(), assignment.getCourse());

        if (assignment.getTotalMarks() != null && request.marks() > assignment.getTotalMarks()) {
            throw new BadRequestException("Marks cannot be more than " + assignment.getTotalMarks());
        }
        submission.setMarks(request.marks());
        submission.setFeedback(request.feedback());
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus(SubmissionStatus.GRADED);
        AssignmentSubmission saved = assignmentSubmissionRepository.save(submission);
        notificationService.notify(submission.getStudent(), NotificationType.ASSIGNMENT_GRADED,
                "Your submission for " + assignment.getTitle() + " was graded: " + request.marks() + "/" + assignment.getTotalMarks(),
                "/student/assignments/" + assignment.getId());
        return toResponse(saved);
    }

    private AssignmentSubmission findSubmission(Integer id) {
        return assignmentSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("submission not found with id: " + id));
    }

    private void checkCanView(User user, Assignment assignment, User student) {
        boolean own = user.getId().equals(student.getId());
        if (!own && !currentUserService.isAdminOrOwner(user, assignment.getCourse().getTeacher())) {
            throw new UnauthorizedAccessException("You are not authorized to see this submission");
        }
    }
}

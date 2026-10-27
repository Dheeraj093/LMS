package com.example.LMS.service;

import com.example.LMS.DTO.GroupRequest;
import com.example.LMS.DTO.GroupResponse;
import com.example.LMS.DTO.StudentSummary;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.BadRequestException;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Assignment;
import com.example.LMS.model.NotificationType;
import com.example.LMS.model.Quiz;
import com.example.LMS.model.StudentGroup;
import com.example.LMS.model.User;
import com.example.LMS.model.UserStatus;
import com.example.LMS.repository.AssignmentRepositry;
import com.example.LMS.repository.QuizRepositry;
import com.example.LMS.repository.StudentGroupRepository;
import com.example.LMS.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

// Student groups: a teacher puts students in a batch once and then limits quizzes and assignments to it.
// Rules:
// - a teacher sees and changes only their own groups, an admin sees all
// - members must be student accounts
// - a student can see the groups they are in, but not the other members' names or emails
@Service
public class GroupService {

    @Autowired
    private StudentGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizRepositry quizRepositry;

    @Autowired
    private AssignmentRepositry assignmentRepositry;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CurrentUserService currentUserService;

    // Teacher: own groups. Admin: every group.
    public List<GroupResponse> getGroups() {
        User user = currentUserService.getCurrentUser();
        List<StudentGroup> groups = currentUserService.isAdmin(user)
                ? groupRepository.findAllByOrderByNameAsc()
                : groupRepository.findByTeacherOrderByNameAsc(user);
        return groups.stream().map(g -> toResponse(g, true)).toList();
    }

    @Transactional
    public GroupResponse createGroup(GroupRequest request) {
        User teacher = currentUserService.getCurrentUser();
        String name = request.name().trim();
        if (groupRepository.findByNameIgnoreCaseAndTeacher(name, teacher) != null) {
            throw new ResourceAlreadyExistException("You already have a group named " + name);
        }
        StudentGroup group = new StudentGroup();
        group.setTeacher(teacher);
        group.setName(name);
        group.setDescription(request.description());
        group.setMembers(findStudents(request.memberIds()));
        StudentGroup saved = groupRepository.save(group);
        notifyNewMembers(saved, List.of());
        return toResponse(saved, true);
    }

    // The group teacher and admins get the full member list. A member student gets the short view.
    public GroupResponse getGroup(Integer id) {
        StudentGroup group = findGroup(id);
        User user = currentUserService.getCurrentUser();
        if (currentUserService.isAdminOrOwner(user, group.getTeacher())) {
            return toResponse(group, true);
        }
        if (isMember(group, user)) {
            return toResponse(group, false);
        }
        throw new UnauthorizedAccessException("You are not allowed to see this group");
    }

    @Transactional
    public GroupResponse updateGroup(Integer id, GroupRequest request) {
        StudentGroup group = findOwnedGroup(id);
        String name = request.name().trim();
        StudentGroup sameName = groupRepository.findByNameIgnoreCaseAndTeacher(name, group.getTeacher());
        if (sameName != null && !sameName.getId().equals(id)) {
            throw new ResourceAlreadyExistException("You already have a group named " + name);
        }
        List<User> before = new ArrayList<>(group.getMembers());
        group.setName(name);
        group.setDescription(request.description());
        group.setMembers(findStudents(request.memberIds()));
        StudentGroup saved = groupRepository.save(group);
        notifyNewMembers(saved, before);
        return toResponse(saved, true);
    }

    // Quizzes and assignments that used the group simply stop using it.
    // If such an item has no group left, only its teacher sees it until they pick a new audience.
    @Transactional
    public Boolean deleteGroup(Integer id) {
        StudentGroup group = findOwnedGroup(id);
        for (Quiz quiz : quizRepositry.findByGroupsContaining(group)) {
            quiz.getGroups().removeIf(g -> g.getId().equals(group.getId()));
            quizRepositry.save(quiz);
        }
        for (Assignment assignment : assignmentRepositry.findByGroupsContaining(group)) {
            assignment.getGroups().removeIf(g -> g.getId().equals(group.getId()));
            assignmentRepositry.save(assignment);
        }
        groupRepository.delete(group);
        return true;
    }

    // Student: the groups I am in.
    public List<GroupResponse> getMyGroups() {
        User student = currentUserService.getCurrentUser();
        return groupRepository.findByMembersContainingOrderByNameAsc(student).stream()
                .map(g -> toResponse(g, false)).toList();
    }

    // The student "My groups" page calls /groups/student/{id}.
    // The student themself gets the short view, an admin gets everything,
    // a teacher gets only their own groups that contain this student.
    public List<GroupResponse> getGroupsOfStudent(Integer studentId) {
        User user = currentUserService.getCurrentUser();
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourseNotFoundException("User not found with id " + studentId));
        if (user.getId().equals(studentId)) {
            return getMyGroups();
        }
        if (currentUserService.isAdmin(user)) {
            return groupRepository.findByMembersContainingOrderByNameAsc(student).stream()
                    .map(g -> toResponse(g, true)).toList();
        }
        if (currentUserService.isTeacher(user)) {
            return groupRepository.findByTeacherAndMembersContainingOrderByNameAsc(user, student).stream()
                    .map(g -> toResponse(g, true)).toList();
        }
        throw new UnauthorizedAccessException("You can only see your own groups");
    }

    // Students a teacher can add to a group. Blocked and pending accounts are left out.
    public List<StudentSummary> getStudents(String search) {
        String like = search == null || search.isBlank() ? null : "%" + search.trim().toLowerCase() + "%";
        return userRepository.search(CurrentUserService.STUDENT, null, like, Pageable.unpaged(Sort.by("name")))
                .getContent().stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(this::toSummary)
                .toList();
    }

    // Used by quizzes and assignments: turns ids into groups and checks they belong to the item's teacher.
    public List<StudentGroup> resolveGroups(List<Integer> ids, User owner) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }
        List<Integer> unique = new ArrayList<>(new LinkedHashSet<>(ids));
        List<StudentGroup> groups = groupRepository.findAllById(unique);
        if (groups.size() != unique.size()) {
            throw new BadRequestException("Some selected groups do not exist");
        }
        User user = currentUserService.getCurrentUser();
        for (StudentGroup group : groups) {
            boolean ownersGroup = group.getTeacher() != null && group.getTeacher().getId().equals(owner.getId());
            if (!ownersGroup && !currentUserService.isAdmin(user)) {
                throw new BadRequestException("You can only use your own groups (" + group.getName() + " is not yours)");
            }
        }
        return new ArrayList<>(groups);
    }

    public GroupResponse toResponse(StudentGroup group, boolean full) {
        List<User> members = group.getMembers() == null ? List.of() : group.getMembers();
        List<Integer> memberIds = members.stream().map(User::getId).toList();
        List<StudentSummary> details = full
                ? members.stream().sorted(Comparator.comparing(User::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                        .map(this::toSummary).toList()
                : null;
        User teacher = group.getTeacher();
        return new GroupResponse(group.getId(), group.getName(), group.getDescription(),
                teacher != null ? teacher.getId() : null, teacher != null ? teacher.getName() : null,
                members.size(), memberIds, details, group.getCreatedAt());
    }

    private StudentSummary toSummary(User u) {
        return new StudentSummary(u.getId(), u.getName(), u.getEmail(), u.getAvatarUrl());
    }

    private List<User> findStudents(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }
        List<Integer> unique = new ArrayList<>(new LinkedHashSet<>(ids));
        List<User> users = userRepository.findAllById(unique);
        if (users.size() != unique.size()) {
            throw new BadRequestException("Some selected students do not exist");
        }
        for (User u : users) {
            if (!currentUserService.isStudent(u)) {
                throw new BadRequestException(u.getName() + " is not a student, so cannot be added to a group");
            }
        }
        return new ArrayList<>(users);
    }

    private void notifyNewMembers(StudentGroup group, List<User> before) {
        Set<Integer> old = new HashSet<>();
        before.forEach(u -> old.add(u.getId()));
        for (User member : group.getMembers()) {
            if (!old.contains(member.getId())) {
                notificationService.notify(member, NotificationType.ADDED_TO_GROUP,
                        "You were added to the group " + group.getName(), "/student/groups");
            }
        }
    }

    private boolean isMember(StudentGroup group, User user) {
        return group.getMembers() != null && group.getMembers().stream().anyMatch(m -> m.getId().equals(user.getId()));
    }

    private StudentGroup findGroup(Integer id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Group not found with id " + id));
    }

    private StudentGroup findOwnedGroup(Integer id) {
        StudentGroup group = findGroup(id);
        if (!currentUserService.isAdminOrOwner(currentUserService.getCurrentUser(), group.getTeacher())) {
            throw new UnauthorizedAccessException("Only the group teacher can change this group");
        }
        return group;
    }
}

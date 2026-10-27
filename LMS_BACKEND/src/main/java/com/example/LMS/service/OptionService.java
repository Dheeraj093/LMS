package com.example.LMS.service;

import com.example.LMS.DTO.OptionRequest;
import com.example.LMS.DTO.OptionResponse;
import com.example.LMS.config.CurrentUserService;
import com.example.LMS.exception.ResourceAlreadyExistException;
import com.example.LMS.exception.ResourseNotFoundException;
import com.example.LMS.exception.UnauthorizedAccessException;
import com.example.LMS.model.Option;
import com.example.LMS.model.Question;
import com.example.LMS.model.User;
import com.example.LMS.repository.OptionRepositry;
import com.example.LMS.repository.QuestionRepositry;
import com.example.LMS.repository.QuizAnswerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class OptionService {

    @Autowired
    OptionRepositry optionRepositry;

    @Autowired
    QuestionRepositry questionRepositry;

    @Autowired
    QuizAnswerRepository quizAnswerRepository;

    @Autowired
    CurrentUserService currentUserService;

    // showCorrect = false hides the right answer (used while a student takes a quiz).
    public OptionResponse makeResponse(Option option, boolean showCorrect) {
        return new OptionResponse(option.getId(), option.getOptionText(), option.getQuestion().getId(),
                showCorrect ? option.getCorrect() : null);
    }

    public OptionResponse makeResponse(Option option) {
        return makeResponse(option, true);
    }

    // Options are always sorted by id, so "option 1..4" keep the same order on every call.
    public List<Option> optionsOf(Question question) {
        return optionRepositry.findByQuestion(question).stream()
                .sorted(Comparator.comparing(Option::getId))
                .toList();
    }

    // Called by QuestionService when a question is created.
    public Option createOption(OptionRequest optionRequest, Question question) {
        List<Option> optionList = optionRepositry.findByQuestion(question);
        if (optionList.size() >= 4) {
            throw new ResourceAlreadyExistException("A question can have only 4 options");
        }
        String text = optionRequest.optionText().trim();
        if (optionRepositry.findByOptionTextAndQuestion(text, question) != null) {
            throw new ResourceAlreadyExistException("Option with text " + text + " already exists");
        }

        Option option = new Option();
        option.setOptionText(text);
        option.setCorrect(Boolean.TRUE.equals(optionRequest.correct()));
        option.setQuestion(question);
        return optionRepositry.save(option);
    }

    // The id now comes from the URL. Before, the URL id was ignored and the id inside the body was used.
    public OptionResponse updateOption(Integer id, OptionRequest optionRequest) {
        Option option = findOwnedOption(id);
        option.setOptionText(optionRequest.optionText().trim());
        option.setCorrect(Boolean.TRUE.equals(optionRequest.correct()));
        return makeResponse(optionRepositry.save(option));
    }

    public Boolean deleteOption(Integer id) {
        Option option = findOwnedOption(id);
        // Students have already picked this option in a quiz; deleting it would break their results.
        if (quizAnswerRepository.existsBySelectedOption(option)) {
            throw new ResourceAlreadyExistException("Students already chose this option in a quiz, so it cannot be deleted");
        }
        optionRepositry.delete(option);
        return true;
    }

    // Only the question owner (or an admin) sees which option is correct.
    public List<OptionResponse> getOptionByQuestionId(Integer questionId) {
        Question question = questionRepositry.findById(questionId)
                .orElseThrow(() -> new ResourseNotFoundException("Question not found with id " + questionId));
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, question.getTeacher())) {
            throw new UnauthorizedAccessException("You are not authorized to perform this operation");
        }
        return optionsOf(question).stream().map(this::makeResponse).toList();
    }

    private Option findOwnedOption(Integer id) {
        Option option = optionRepositry.findById(id)
                .orElseThrow(() -> new ResourseNotFoundException("Option not found with id " + id));
        User user = currentUserService.getCurrentUser();
        if (!currentUserService.isAdminOrOwner(user, option.getQuestion().getTeacher())) {
            throw new UnauthorizedAccessException("You are not authorized to perform this operation");
        }
        return option;
    }
}

package com.example.LMS.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;

// Sends emails through SMTP (Gmail by default, settings in application.properties: spring.mail.* and app.mail.*).
// When app.mail.enabled=false nothing is sent and the email is written to the log, so development works without Gmail.
// Every method runs in the background (@Async): a slow or broken mail server never slows down or breaks an API call.
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean enabled;
    private final String from;
    private final String fromName;
    private final String frontendUrl;

    public MailService(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${app.mail.enabled:false}") boolean enabled,
                       @Value("${app.mail.from:no-reply@learnly.local}") String from,
                       @Value("${app.mail.from-name:Learnly}") String fromName,
                       @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.fromName = fromName;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    public boolean isEnabled() {
        return enabled;
    }

    // "/student/courses/3" -> "http://localhost:5173/student/courses/3". Full URLs are kept as they are.
    public String absoluteLink(String link) {
        if (link == null || link.isBlank()) {
            return frontendUrl;
        }
        if (link.startsWith("http://") || link.startsWith("https://")) {
            return link;
        }
        return frontendUrl + (link.startsWith("/") ? link : "/" + link);
    }

    @Async
    public void sendPasswordReset(String to, String name, String link) {
        send(to, "Reset your Learnly password", layout(name,
                "We got a request to reset your password. The link works for 30 minutes and only once.",
                "Reset password", link,
                "If you did not ask for this, you can ignore this email. Your password stays the same."));
    }

    @Async
    public void sendVerification(String to, String name, String link) {
        send(to, "Confirm your email for Learnly", layout(name,
                "Welcome to Learnly! Please confirm your email address to finish creating your account. The link works for 24 hours.",
                "Confirm email", link,
                "If you did not create an account, you can ignore this email."));
    }

    @Async
    public void sendNotification(String to, String name, String subject, String message, String link) {
        send(to, subject, layout(name, message, "Open Learnly", absoluteLink(link),
                "You get this email because of activity on your Learnly account."));
    }

    // Plain send used by the methods above. Errors are logged, never thrown, because this runs in the background.
    void send(String to, String subject, String html) {
        if (!enabled) {
            log.info("Email is off (app.mail.enabled=false). Would send to {}: {}\n{}", to, subject, toPlainText(html));
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("Email is on but no mail server is configured (spring.mail.host). Email to {} not sent", to);
            return;
        }
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(toPlainText(html), html);
            sender.send(mime);
            log.info("Email sent to {}: {}", to, subject);
        } catch (Exception ex) {
            log.warn("Could not send email to {} ({}): {}", to, subject, ex.getMessage());
        }
    }

    // A simple, mobile friendly email with one button. All user text is escaped.
    private String layout(String name, String message, String buttonText, String link, String footer) {
        String safeLink = HtmlUtils.htmlEscape(link);
        return """
                <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f3ff;padding:24px">
                  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px">
                    <div style="font-size:20px;font-weight:bold;color:#5B4CF0;margin-bottom:16px">Learnly</div>
                    <p style="font-size:15px;color:#1f2937">Hi %s,</p>
                    <p style="font-size:15px;color:#1f2937;line-height:1.5">%s</p>
                    <p style="margin:24px 0"><a href="%s" style="background:#5B4CF0;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">%s</a></p>
                    <p style="font-size:12px;color:#6b7280">If the button does not work, copy this link into your browser:<br>%s</p>
                    <p style="font-size:12px;color:#6b7280;margin-top:20px">%s</p>
                  </div>
                </div>
                """.formatted(HtmlUtils.htmlEscape(name == null || name.isBlank() ? "there" : name),
                HtmlUtils.htmlEscape(message), safeLink, HtmlUtils.htmlEscape(buttonText), safeLink,
                HtmlUtils.htmlEscape(footer));
    }

    private static String toPlainText(String html) {
        return HtmlUtils.htmlUnescape(html.replaceAll("<br>", "\n").replaceAll("</p>", "\n").replaceAll("<[^>]+>", ""))
                .replaceAll("[ \\t]+", " ").replaceAll("\\n\\s*\\n+", "\n").trim();
    }
}

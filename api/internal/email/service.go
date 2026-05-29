package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"os"
)

type EmailService interface {
	SendplotInvite(ctx context.Context, to, plotName, inviteURL string) error
	SendplotAccessGranted(ctx context.Context, to, plotName string) error
	SendWelcome(ctx context.Context, to string) error
	SendResetPassword(ctx context.Context, to string, resetURL string) error
}

func New() EmailService {
	provider := getEnv("EMAIL_PROVIDER", "smtp")
	from := getEnv("EMAIL_FROM", "noreply@plotplanner.local")

	if provider == "resend" {
		return &ResendEmailService{
			apiKey: os.Getenv("RESEND_API_KEY"),
			from:   from,
		}
	}

	return &SMTPEmailService{
		host: getEnv("SMTP_HOST", "localhost"),
		port: getEnv("SMTP_PORT", "1025"),
		from: from,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// --- SMTP (dev / Mailhog) ---

type SMTPEmailService struct {
	host string
	port string
	from string
}

func (s *SMTPEmailService) SendplotInvite(_ context.Context, to, plotName, inviteURL string) error {
	subject := fmt.Sprintf("You've been invited to %q", plotName)
	body := renderPlotInvite(plotName, inviteURL)
	return s.send(to, subject, body)
}

func (s *SMTPEmailService) SendplotAccessGranted(_ context.Context, to, plotName string) error {
	subject := fmt.Sprintf("You now have access to %q", plotName)
	body := renderPlotAccessGranted(plotName)
	return s.send(to, subject, body)
}

func (s *SMTPEmailService) SendWelcome(_ context.Context, to string) error {
	return s.send(to, "Welcome to PlotPlanner!", renderWelcome(to))
}

func (s *SMTPEmailService) SendResetPassword(_ context.Context, to string, resetURL string) error {
	return s.send(to, "Reset your password", renderResetPassword(to, resetURL))
}

func (s *SMTPEmailService) send(to, subject, htmlBody string) error {
	msg := buildMIMEMessage(s.from, to, subject, htmlBody)
	addr := s.host + ":" + s.port
	return smtp.SendMail(addr, nil, s.from, []string{to}, []byte(msg))
}

// --- Resend ---

type ResendEmailService struct {
	apiKey string
	from   string
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (r *ResendEmailService) SendplotInvite(ctx context.Context, to, plotName, inviteURL string) error {
	subject := fmt.Sprintf("You've been invited to %q", plotName)
	body := renderPlotInvite(plotName, inviteURL)
	return r.send(ctx, to, subject, body)
}

func (r *ResendEmailService) SendplotAccessGranted(ctx context.Context, to, plotName string) error {
	subject := fmt.Sprintf("You now have access to %q", plotName)
	body := renderPlotAccessGranted(plotName)
	return r.send(ctx, to, subject, body)
}

func (r *ResendEmailService) SendWelcome(ctx context.Context, to string) error {
	return r.send(ctx, to, "Welcome to PlotPlanner!", renderWelcome(to))
}

func (s *ResendEmailService) SendResetPassword(ctx context.Context, to string, resetURL string) error {
	return s.send(ctx, to, "Reset your password", renderResetPassword(to, resetURL))
}

func (r *ResendEmailService) send(ctx context.Context, to, subject, htmlBody string) error {
	payload := resendRequest{
		From:    r.from,
		To:      []string{to},
		Subject: subject,
		HTML:    htmlBody,
	}

	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend: unexpected status %d", resp.StatusCode)
	}
	return nil
}

func buildMIMEMessage(from, to, subject, htmlBody string) string {
	return fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s",
		from, to, subject, htmlBody,
	)
}

package email

import (
	"bytes"
	"html/template"
)

var plotInviteTmpl = template.Must(template.New("plot_invite").Parse(`
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #222; max-width: 480px; margin: 40px auto;">
  <h2>You've been invited to <strong>{{.PlotName}}</strong></h2>
  <p>Someone has shared a plot with you on Plotplanner. Click the button below to set up your account and start collaborating.</p>
  <a href="{{.InviteURL}}"
     style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Register an account
  </a>
  <p style="margin-top:32px;font-size:13px;color:#888;">
    This link expires in 7 days. If you weren't expecting this invitation, you can ignore this email.
  </p>
  <p style="font-size:13px;color:#888;">Or copy this URL into your browser:<br>{{.InviteURL}}</p>
</body>
</html>
`))

var plotAccessGrantedTmpl = template.Must(template.New("plot_access_granted").Parse(`
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #222; max-width: 480px; margin: 40px auto;">
  <h2>You now have access to <strong>{{.PlotName}}</strong></h2>
  <p>You've been invited to a plot on plotplanner. Log in to start collaborating.</p>
</body>
</html>
`))

var welcomeTmpl = template.Must(template.New("welcome").Parse(`
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #222; max-width: 480px; margin: 40px auto;">
  <h2>Welcome to Plotplanner!</h2>
  <p>Thanks for registering, <strong>{{.Email}}</strong>. Your account is ready.</p>
  <p>You can start creating and managing plots straight away.</p>
  <p style="margin-top:32px;font-size:13px;color:#888;">If you didn't create this account, you can ignore this email.</p>
</body>
</html>
`))

var resetPasswordTmpl = template.Must(template.New("reset_password").Parse(`
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #222; max-width: 480px; margin: 40px auto;">
  <h2>Reset your password</h2>
  <p>We received a request to reset the password for <strong>{{.Email}}</strong>. Click the button below to choose a new one.</p>
  <a href="{{.ResetURL}}"
     style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Reset Password
  </a>
  <p style="margin-top:32px;font-size:13px;color:#888;">
    This link expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
  </p>
  <p style="font-size:13px;color:#888;">Or copy this URL into your browser:<br>{{.ResetURL}}</p>
</body>
</html>
`))

func renderPlotInvite(plotName, inviteURL string) string {
	var buf bytes.Buffer
	plotInviteTmpl.Execute(&buf, struct {
		PlotName  string
		InviteURL string
	}{plotName, inviteURL})
	return buf.String()
}

func renderPlotAccessGranted(plotName string) string {
	var buf bytes.Buffer
	plotAccessGrantedTmpl.Execute(&buf, struct{ PlotName string }{plotName})
	return buf.String()
}

func renderWelcome(email string) string {
	var buf bytes.Buffer
	welcomeTmpl.Execute(&buf, struct{ Email string }{email})
	return buf.String()
}

func renderResetPassword(email string, resetURL string) string {
	var buf bytes.Buffer
	resetPasswordTmpl.Execute(&buf, struct {
		Email    string
		ResetURL string
	}{email, resetURL})
	return buf.String()
}

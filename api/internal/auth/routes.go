package auth

import (
	"plotplanner/internal/email"
	"plotplanner/internal/invites"
	"plotplanner/internal/jwt"
	"plotplanner/internal/plots"
	"plotplanner/internal/users"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(
	app *fiber.App,
	userRepo *users.Repository,
	plotRepo *plots.Repository,
	inviteRepo *invites.Repository,
	emailSvc email.EmailService,
	jwtService *jwt.JWTService,
) {
	app.Post("/auth/register", Register(userRepo, plotRepo, inviteRepo, emailSvc, jwtService))
	app.Post("/auth/reset-password", SendResetPasswordEmail(userRepo, emailSvc))
	app.Post("/auth/reset-password/:token", ResetPassword(userRepo))
	app.Post("/auth/login", Login(userRepo, jwtService))
	app.Post("/auth/logout", Logout())
	app.Get("/auth/me", Me(userRepo, jwtService))
}

package plots

import (
	"plotplanner/internal/email"
	"plotplanner/internal/invites"
	"plotplanner/internal/users"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(
	app *fiber.App,
	plotRepo *Repository,
	userRepo *users.Repository,
	inviteRepo *invites.Repository,
	emailSvc email.EmailService,
	jwtMiddleware fiber.Handler,
) {
	// Public — no auth required (used before login/register to prefill email)
	app.Get("/plots/invite-info/:token", GetInviteInfo(inviteRepo))

	plotsGroup := app.Group("/plots", jwtMiddleware)

	plotsGroup.Post("/", CreatePlot(plotRepo))
	plotsGroup.Get("/", ListPlots(plotRepo))
	plotsGroup.Get("/invites", ListInvites(inviteRepo))
	plotsGroup.Get("/:id", GetPlot(plotRepo))
	plotsGroup.Post("/:id/invite", InviteToPlot(plotRepo, userRepo, inviteRepo, emailSvc))
	plotsGroup.Post("/accept-invite/:token", AcceptPlotInvite(plotRepo, inviteRepo))
	plotsGroup.Post("/decline-invite/:token", DeclinePlotInvite(inviteRepo))
}

package main

import (
	"log"
	"os"
	"time"

	"plotplanner/internal/auth"
	internaldb "plotplanner/internal/db"
	"plotplanner/internal/email"
	"plotplanner/internal/invites"
	"plotplanner/internal/jwt"
	"plotplanner/internal/plants"
	"plotplanner/internal/plots"
	"plotplanner/internal/timeline"
	"plotplanner/internal/users"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	database, err := internaldb.Connect()
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173, https://plotplanner.eddesten.dev",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept",
		AllowCredentials: true,
	}))

	jwtService := jwt.New(os.Getenv("JWT_SECRET"), "plotplanner", time.Hour*24)
	jwtMiddleware := jwt.Protected(jwtService)

	usersRepo := &users.Repository{DB: database.Pool}
	plotsRepo := &plots.Repository{DB: database.Pool}
	invitesRepo := &invites.Repository{DB: database.Pool}
	plantsRepo := &plants.Repository{DB: database.Pool}
	timelineRepo := &timeline.Repository{DB: database.Pool}
	emailSvc := email.New()

	auth.RegisterRoutes(app, usersRepo, plotsRepo, invitesRepo, emailSvc, jwtService)
	plots.RegisterRoutes(app, plotsRepo, usersRepo, invitesRepo, emailSvc, jwtMiddleware)
	plants.RegisterRoutes(app, plantsRepo, plotsRepo, jwtMiddleware)
	timeline.RegisterRoutes(app, timelineRepo, plantsRepo, jwtMiddleware)

	if err := app.Listen(":3001"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

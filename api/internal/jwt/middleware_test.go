package jwt

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

type JWTMiddlewareTestSuite struct {
	suite.Suite
	jwtService *JWTService
	app        *fiber.App
}

func (s *JWTMiddlewareTestSuite) SetupTest() {
	s.jwtService = New("test-secret-key", "test-issuer", 24*time.Hour)
	s.app = fiber.New()

	// Setup a protected route for testing
	s.app.Get("/protected", Protected(s.jwtService), func(c *fiber.Ctx) error {
		userId := c.Locals("userId").(int)
		email := c.Locals("email").(string)
		return c.JSON(fiber.Map{
			"userId": userId,
			"email":  email,
		})
	})
}

func (s *JWTMiddlewareTestSuite) TestValidToken_ShouldAllowAccess() {
	// Generate a valid token
	token, err := s.jwtService.GenerateToken(123, "test@example.com")
	assert.NoError(s.T(), err)

	// Create request with auth cookie
	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth",
		Value: token,
	})

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusOK, resp.StatusCode)
}

func (s *JWTMiddlewareTestSuite) TestMissingAuthCookie_ShouldReturn401() {
	req := httptest.NewRequest("GET", "/protected", nil)

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func (s *JWTMiddlewareTestSuite) TestInvalidTokenFormat_ShouldReturn401() {
	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth",
		Value: "invalid.token.format",
	})

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func (s *JWTMiddlewareTestSuite) TestExpiredToken_ShouldReturn401() {
	// Create a JWT service with very short duration
	shortLivedService := New("test-secret-key", "test-issuer", -1*time.Hour)
	token, err := shortLivedService.GenerateToken(123, "test@example.com")
	assert.NoError(s.T(), err)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth",
		Value: token,
	})

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func (s *JWTMiddlewareTestSuite) TestWrongSignature_ShouldReturn401() {
	// Generate token with different secret
	differentService := New("different-secret", "test-issuer", 24*time.Hour)
	token, err := differentService.GenerateToken(123, "test@example.com")
	assert.NoError(s.T(), err)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth",
		Value: token,
	})

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func (s *JWTMiddlewareTestSuite) TestLocalsAreSet_WhenTokenValid() {
	token, err := s.jwtService.GenerateToken(456, "user@example.com")
	assert.NoError(s.T(), err)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth",
		Value: token,
	})

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusOK, resp.StatusCode)

	// The response should contain the userId and email we set
	// (this validates that c.Locals were properly set by the middleware)
}

func (s *JWTMiddlewareTestSuite) TestEmptyAuthCookie_ShouldReturn401() {
	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "auth",
		Value: "",
	})

	resp, err := s.app.Test(req)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func TestJWTMiddlewareTestSuite(t *testing.T) {
	suite.Run(t, new(JWTMiddlewareTestSuite))
}

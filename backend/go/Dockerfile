FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY *.go ./
COPY go.mod ./
RUN CGO_ENABLED=0 go build -o /go-backend .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl \
    && addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /go-backend /usr/local/bin/go-backend
RUN chown appuser:appgroup /usr/local/bin/go-backend
USER appuser
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/api/health || exit 1
CMD ["go-backend"]

FROM zig/zig:0.13.0 AS builder
WORKDIR /app
COPY . .
RUN zig build -Doptimize=ReleaseFast

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl \
    && addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/zig-out/bin/zig-platform /usr/local/bin/zig-platform
RUN chown -R appuser:appgroup /app
USER appgroup
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8090/api/v1/flags || exit 1
CMD ["zig-platform"]

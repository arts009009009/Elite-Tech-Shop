FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apk add --no-cache maven && mvn package -DskipTests -q && cp target/elite-shop-backend-*.jar /app/app.jar

FROM eclipse-temurin:21-jdk-alpine AS extract
WORKDIR /app
COPY --from=builder /app/app.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract --destination extracted

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=extract /app/extracted/dependencies/ ./
COPY --from=extract /app/extracted/spring-boot-loader/ ./
COPY --from=extract /app/extracted/snapshot-dependencies/ ./
COPY --from=extract /app/extracted/application/ ./
EXPOSE 3001
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]

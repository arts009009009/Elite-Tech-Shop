cmake_minimum_required(VERSION 3.16)

project(elite_shop_cpp_backend
    VERSION 1.0.0
    DESCRIPTION "Scientific & Symbolic Calculator microservice for Elite Tech Shop (Frostbite OS)"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
        Debug Release RelWithDebInfo MinSizeRel)
endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include(FetchContent)

find_package(Threads REQUIRED)

set(_extract_timestamp_args)
if(CMAKE_VERSION VERSION_GREATER_EQUAL 3.24)
    set(_extract_timestamp_args DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
endif()

find_path(ASIO_INCLUDE_DIR NAMES asio.hpp)

if(NOT ASIO_INCLUDE_DIR)
    message(STATUS "Standalone asio not found, fetching asio 1.30.2")
    FetchContent_Declare(asio
        URL https://github.com/chriskohlhoff/asio/archive/refs/tags/asio-1-30-2.tar.gz
        ${_extract_timestamp_args}
    )
    FetchContent_MakeAvailable(asio)
    set(ASIO_INCLUDE_DIR "${asio_SOURCE_DIR}/asio/include" CACHE PATH "asio headers" FORCE)
endif()

find_package(Crow QUIET)

if(NOT TARGET Crow::Crow)
    message(STATUS "Crow not found, fetching Crow v1.3.4")
    set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "Build Crow examples")
    set(CROW_BUILD_TESTS OFF CACHE BOOL "Build Crow tests")
    set(CROW_INSTALL OFF CACHE BOOL "Install Crow")
    set(CROW_GENERATE_SBOM OFF CACHE BOOL "Generate Crow SBOM")
    set(CROW_USE_BOOST OFF CACHE BOOL "Use Boost.Asio for Crow")
    FetchContent_Declare(Crow
        URL https://github.com/CrowCpp/Crow/archive/refs/tags/v1.3.4.tar.gz
        ${_extract_timestamp_args}
    )
    FetchContent_MakeAvailable(Crow)
endif()

add_executable(calc_server
    src/main.cpp
    src/lexer.cpp
    src/parser.cpp
    src/evaluator.cpp
    src/symbolic.cpp
)

target_include_directories(calc_server PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/src")
target_link_libraries(calc_server PRIVATE Crow::Crow Threads::Threads)
target_compile_options(calc_server PRIVATE -Wall -Wextra)

install(TARGETS calc_server RUNTIME DESTINATION bin)

cmake_minimum_required(VERSION 3.20)

project(chess
    VERSION 0.1.0
    DESCRIPTION "Chess engine"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.18.0 # pinned; latest as of 29-08-2026
)

FetchContent_MakeAvailable(googletest)

enable_testing()

# Warnings and Sanitizers must precede target definitions:
#   both configure chess_warnings, which the targets link
# StaticAnalysis must follow them:
#   it sets properties on targets that must already exist
include(Warnings)
include(Sanitizers)

# universal chess interface
add_executable(chess_uci)
target_sources(chess_uci
    PRIVATE
        apps/uci/main.cpp
)
target_link_libraries(chess_uci
    PRIVATE
        chess_warnings
)

include(StaticAnalysis)
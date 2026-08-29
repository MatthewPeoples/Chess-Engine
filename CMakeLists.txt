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

add_library(chess_lib)

target_sources(chess_lib
    PRIVATE
        src/bitboard.cpp
)
target_include_directories(chess_lib
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_features(chess_lib
    PUBLIC
        cxx_std_20
)


add_executable(chess_uci)

target_sources(chess_uci
    PRIVATE
        apps/uci/main.cpp
)
target_link_libraries(chess_uci
    PRIVATE
        chess_lib
)

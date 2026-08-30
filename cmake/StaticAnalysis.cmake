# optional tidy checks at compile time
option(CHESS_ENABLE_CLANG_TIDY "Run clang-tidy during build" OFF)

if(CHESS_ENABLE_CLANG_TIDY)
    find_program(CLANG_TIDY_EXE NAMES clang-tidy REQUIRED)
    set_target_properties(chess_lib chess_uci chess_tests
        PROPERTIES CXX_CLANG_TIDY "${CLANG_TIDY_EXE}"
    )
endif()

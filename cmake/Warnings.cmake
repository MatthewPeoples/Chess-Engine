# warnings
add_library(chess_warnings INTERFACE)
if(MSVC) # windows
    target_compile_options(chess_warnings
        INTERFACE
            /W4           # comparable to -Wall -Wextra
            /WX           # fail build on any warning
            /permissive-  # enforce standard conformance
    )
else() # macOS, linux
    target_compile_options(chess_warnings
        INTERFACE
            -Wall
            -Wextra
            -Wpedantic
            -Werror       # fail build on any warning
    )
endif()

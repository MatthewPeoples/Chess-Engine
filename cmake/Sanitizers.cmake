# optional sanitisers at runtime
option(CHESS_ENABLE_SANITIZERS "Build with address and UB sanitizers" OFF)

if(CHESS_ENABLE_SANITIZERS)
    if(MSVC)
        target_compile_options(chess_warnings
            INTERFACE
                /fsanitize=address # windows doesnt have UBsan
        ) # MSVC doesnt need `target_link_options`, its ASan links automatically at runtime
    else()
        target_compile_options(chess_warnings
            INTERFACE
                -fsanitize=address,undefined
                -fno-omit-frame-pointer
        )
        target_link_options(chess_warnings
            INTERFACE
                -fsanitize=address,undefined
        )
    endif()
endif()

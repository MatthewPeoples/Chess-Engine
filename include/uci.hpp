#pragma once

#include <iosfwd>

// the Universal Chess Interface: plain text over stdin and stdout, which is all a GUI speaks

namespace chess {

void uci_loop(std::istream& in, std::ostream& out);

}  // namespace chess

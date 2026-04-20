CXX = g++
VCPKG_ROOT = C:/vcpkg/installed/x64-windows
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -pthread -I$(VCPKG_ROOT)/include
LDFLAGS = -L$(VCPKG_ROOT)/lib -ljsoncpp
TARGET = ml_trainer
SOURCES = neural_network.cpp data_processor.cpp ../dinic.cpp ../synergy_dpp.cpp main.cpp
HEADERS = neural_network.h ../dinic.h ../synergy_dpp.h

$(TARGET): $(SOURCES) $(HEADERS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SOURCES) $(LDFLAGS)

clean:
	rm -f $(TARGET).exe

install:
	cp $(TARGET).exe ../../../bin/

.PHONY: clean install
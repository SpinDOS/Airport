QT -= gui

CONFIG += c++11 console
CONFIG -= app_bundle

# You can also make your code fail to compile if you use deprecated APIs.
# In order to do so, uncomment the following line.
# You can also select to disable deprecated APIs only up to a certain version of Qt.
#DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0x060000    # disables all the APIs deprecated before Qt 6.0.0

SOURCES += main.cpp \
	gtc.cpp \
    amqp_sender.cpp


unix:!macx: LIBS += -L$$PWD/lib/ -lrabbitmq

INCLUDEPATH += $$PWD/.
DEPENDPATH += $$PWD/.

HEADERS += \
	gtc.h \
    service.h \
    env.h \
    amqp_sender.h


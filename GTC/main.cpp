#include <QCoreApplication>
#include <QTime>

#include <signal.h>
#include "gtc.h"

GtcLogic gtc;

const QString configPath = "config/credits.json";

enum class GtcState {
	Init,
	Opening,
	Reopening,
	Processing,
	Closing,
	Closed
};

GtcState state = GtcState::Init;

void start()
{
	int r;
	for (;;) {
		switch (state) {
		case GtcState::Init:
			if (gtc.init(configPath))
				exit(EXIT_FAILURE);
			state = GtcState::Opening;
			break;
		case GtcState::Opening:
			if (gtc.open() == 0)
				state = GtcState::Processing;
			else
				state = GtcState::Reopening;
			break;
		case GtcState::Processing:
			r = gtc.process();
			if (r == EINVAL)
				state = GtcState::Closing;
			else if (r == EAGAIN)
				state = GtcState::Reopening;
			break;
		case GtcState::Reopening:
			qWarning() << QTime::currentTime().toString("hh:mm:ss")
					   << "[SYSTEM] GTC move to Reopening state";
			gtc.close();
			state = GtcState::Opening;
			break;
		case GtcState::Closing:
			gtc.close();
			state = GtcState::Closed;
			break;
		case GtcState::Closed:
			gtc.destroy();
			return;
		}
	}
}

void shutdown_handler(int)
{
	qDebug() << "";
	qDebug() << QTime::currentTime().toString("hh:mm:ss")
			 << "[SYSTEM] Receive termination signal";
	if (::state != GtcState::Init && ::state != GtcState::Closed) {
		gtc.close();
		gtc.destroy();
	}

	exit(EXIT_SUCCESS);
}


int main(int argc, char* argv[])
{
	QCoreApplication a(argc, argv);

	struct sigaction shutdown;
	sigset_t wait_set;

	sigemptyset(&wait_set);
	sigaddset(&wait_set, SIGINT);

	shutdown.sa_mask = wait_set;
	shutdown.sa_flags = 0;
	shutdown.sa_handler = &shutdown_handler;

	if (sigaction(SIGINT, &shutdown, NULL)) {
		qWarning() << QTime::currentTime().toString("hh:mm:ss")
				   << "[SYSTEM] fail subscribe on SIGINT";
		exit(EXIT_FAILURE);
	}

	start();
	return 0;
}

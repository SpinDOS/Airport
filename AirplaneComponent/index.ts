import * as logger from './utils/logger';
import * as mqListen from './mqListen';

mqListen.start();
logger.log('Working');

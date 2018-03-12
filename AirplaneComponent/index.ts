import 'reflect-metadata';
import * as logger from './utils/logger';
import * as mqListen from './mq/mqListen';
import { createAirplane } from './mq/airplaneCreator';

mqListen.start();
logger.log('Working');


let json = {
  landingFlight: {
    id: '46536023-92ca-4fc2-8e96-4e26faafadee',
    code: 'land'
  },

  departureFlight: {
    //id: '46536023-92ca-4fc2-8e96-4e26faafadee',
    code: 'dep'
  },
}
createAirplane(json);
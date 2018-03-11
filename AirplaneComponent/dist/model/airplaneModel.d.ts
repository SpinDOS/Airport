export interface AirplaneModel {
    readonly name: string;
    readonly maxFuel: number;
    readonly maxPassengersCount: number;
    readonly maxBaggageWeight: number;
}
export declare function findRandomModel(passengersCount: number, baggageWeight: number): AirplaneModel;
export declare let allModels: AirplaneModel[];

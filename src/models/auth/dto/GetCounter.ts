// src/models/auth/dto/GetCounter
import { CounterUsage } from "../domain/Counter";

export interface GetCounterUsage {
  counter_usage?: CounterUsage[];
}

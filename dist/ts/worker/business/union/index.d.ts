import { SelectQuery } from "../../types";
import { IError } from "../../interfaces";
export declare class Union {
    execute(query: SelectQuery[], onSuccess: (results: object[]) => void, onError: (err: IError) => void): void;
}

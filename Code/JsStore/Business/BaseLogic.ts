namespace JsStore {
    export namespace Business {
        export class Base extends BaseHelper {
            _error: IError;
            _errorOccured: boolean = false;
            _errorCount = 0;
            _rowAffected = 0;
            _onSuccess: (result?) => void;
            _onError: (err: IError) => void;
            _transaction: IDBTransaction;
            _objectStore: IDBObjectStore;
            _query;
            _sendResultFlag: boolean = true;
            _whereChecker: WhereChecker;
            _tableName: string;

            protected onErrorOccured = function (e, customError = false) {
                ++this._errorCount;
                if (this._errorCount === 1) {
                    if (this._onError != null) {
                        if (!customError) {
                            var error = {
                                _message: (e as any).target.error.message,
                                _type: (e as any).target.error.name
                            } as IError;
                            this._onError(error);
                            logError(error);
                        }
                        else {
                            this._onError(e);
                            logError(e);
                        }
                    }
                }
            };

            protected onTransactionTimeout = function (e) {
                console.error('transaction timed out');
            };

            protected onExceptionOccured = function (ex: DOMException, info) {
                switch (ex.name) {
                    case 'NotFoundError':
                        var error = new Error(Error_Type.TableNotExist, info);
                        this.onErrorOccured(error.get(), true);
                        break;
                    default: console.error(ex);
                }
            };

            protected goToWhereLogic = function () {
                this._whereChecker = new WhereChecker(this._query.Where);
                var column_name = getObjectFirstKey(this._query.Where);
                if (this._query.IgnoreCase === true) {
                    this._query.Where = this.makeQryInCaseSensitive(this._query.Where);
                }
                if (this._objectStore.indexNames.contains(column_name)) {
                    var value = this._query.Where[column_name];
                    if (typeof value === 'object') {
                        this._checkFlag = Boolean(
                            Object.keys(value).length > 1 ||
                            Object.keys(this._query.Where).length > 1
                        );
                        var key = getObjectFirstKey(value);
                        switch (key) {
                            case 'Like': {
                                var filter_values = value.Like.split('%'),
                                    filter_value: string,
                                    occurence: Occurence;
                                if (filter_values[1]) {
                                    filter_value = filter_values[1];
                                    occurence = filter_values.length > 2 ? Occurence.Any : Occurence.Last;
                                }
                                else {
                                    filter_value = filter_values[0];
                                    occurence = Occurence.First;
                                }
                                if (occurence === Occurence.First) {
                                    this.getAllCombinationOfWord(filter_value).forEach(function (item) {
                                        this.executeWhereLogic(column_name,
                                            { '-': { Low: item, High: item + '\uffff' } },
                                            '-');
                                    }, this);
                                    delete this._query.Where[column_name]['Like'];
                                }
                                else {
                                    this.executeLikeLogic(column_name, filter_value, occurence);
                                }
                            } break;
                            case 'In':
                                this.executeInLogic(column_name, value['In']);
                                break;
                            case '-':
                            case '>':
                            case '<':
                            case '>=':
                            case '<=':
                                this.executeWhereLogic(column_name, value, key);
                                break;
                            case 'Aggregate': break;
                            default: this.executeWhereLogic(column_name, value);
                        }
                    }
                    else {
                        this._checkFlag = Boolean(Object.keys(this._query.Where).length > 1);
                        this.executeWhereLogic(column_name, value);
                    }
                }
                else {
                    this._errorOccured = true;
                    this._error = new Error(Error_Type.ColumnNotExist, { ColumnName: column_name });
                    this._error.throw();
                }
            };

            protected makeQryInCaseSensitive = function (qry) {
                var results = [],
                    column_value,
                    key_value;
                for (var column in qry) {
                    column_value = qry[column];
                    if (typeof column_value === 'object') {
                        for (var key in column_value) {
                            key_value = column_value[key];
                            switch (key) {
                                case WhereQryOption.In:
                                    results = results.concat(this.getAllCombinationOfWord(key_value, true));
                                    break;
                                case WhereQryOption.Like:
                                    break;
                                default:
                                    results = results.concat(this.getAllCombinationOfWord(key_value));
                            }
                        }
                        qry[column]['In'] = results;
                    }
                    else {
                        results = results.concat(this.getAllCombinationOfWord(column_value));
                        qry[column] = {
                            In: results
                        };
                    }
                }
                return qry;
            };
        }
    }
}

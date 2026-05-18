var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../node_modules/@supabase/node-fetch/browser.js
var browser_exports = {};
__export(browser_exports, {
  Headers: () => Headers2,
  Request: () => Request2,
  Response: () => Response2,
  default: () => browser_default,
  fetch: () => fetch2
});
var getGlobal, globalObject, fetch2, browser_default, Headers2, Request2, Response2;
var init_browser = __esm({
  "../node_modules/@supabase/node-fetch/browser.js"() {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    getGlobal = /* @__PURE__ */ __name(function() {
      if (typeof self !== "undefined") {
        return self;
      }
      if (typeof window !== "undefined") {
        return window;
      }
      if (typeof global !== "undefined") {
        return global;
      }
      throw new Error("unable to locate global object");
    }, "getGlobal");
    globalObject = getGlobal();
    fetch2 = globalObject.fetch;
    browser_default = globalObject.fetch.bind(globalObject);
    Headers2 = globalObject.Headers;
    Request2 = globalObject.Request;
    Response2 = globalObject.Response;
  }
});

// ../node_modules/@supabase/functions-js/dist/module/helper.js
var resolveFetch;
var init_helper = __esm({
  "../node_modules/@supabase/functions-js/dist/module/helper.js"() {
    init_functionsRoutes_0_6071133848472854();
    resolveFetch = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)), "_fetch");
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
  }
});

// ../node_modules/@supabase/functions-js/dist/module/types.js
var FunctionsError, FunctionsFetchError, FunctionsRelayError, FunctionsHttpError, FunctionRegion;
var init_types = __esm({
  "../node_modules/@supabase/functions-js/dist/module/types.js"() {
    init_functionsRoutes_0_6071133848472854();
    FunctionsError = class extends Error {
      static {
        __name(this, "FunctionsError");
      }
      constructor(message, name = "FunctionsError", context) {
        super(message);
        this.name = name;
        this.context = context;
      }
    };
    FunctionsFetchError = class extends FunctionsError {
      static {
        __name(this, "FunctionsFetchError");
      }
      constructor(context) {
        super("Failed to send a request to the Edge Function", "FunctionsFetchError", context);
      }
    };
    FunctionsRelayError = class extends FunctionsError {
      static {
        __name(this, "FunctionsRelayError");
      }
      constructor(context) {
        super("Relay Error invoking the Edge Function", "FunctionsRelayError", context);
      }
    };
    FunctionsHttpError = class extends FunctionsError {
      static {
        __name(this, "FunctionsHttpError");
      }
      constructor(context) {
        super("Edge Function returned a non-2xx status code", "FunctionsHttpError", context);
      }
    };
    (function(FunctionRegion2) {
      FunctionRegion2["Any"] = "any";
      FunctionRegion2["ApNortheast1"] = "ap-northeast-1";
      FunctionRegion2["ApNortheast2"] = "ap-northeast-2";
      FunctionRegion2["ApSouth1"] = "ap-south-1";
      FunctionRegion2["ApSoutheast1"] = "ap-southeast-1";
      FunctionRegion2["ApSoutheast2"] = "ap-southeast-2";
      FunctionRegion2["CaCentral1"] = "ca-central-1";
      FunctionRegion2["EuCentral1"] = "eu-central-1";
      FunctionRegion2["EuWest1"] = "eu-west-1";
      FunctionRegion2["EuWest2"] = "eu-west-2";
      FunctionRegion2["EuWest3"] = "eu-west-3";
      FunctionRegion2["SaEast1"] = "sa-east-1";
      FunctionRegion2["UsEast1"] = "us-east-1";
      FunctionRegion2["UsWest1"] = "us-west-1";
      FunctionRegion2["UsWest2"] = "us-west-2";
    })(FunctionRegion || (FunctionRegion = {}));
  }
});

// ../node_modules/@supabase/functions-js/dist/module/FunctionsClient.js
var __awaiter, FunctionsClient;
var init_FunctionsClient = __esm({
  "../node_modules/@supabase/functions-js/dist/module/FunctionsClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_helper();
    init_types();
    __awaiter = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    FunctionsClient = class {
      static {
        __name(this, "FunctionsClient");
      }
      constructor(url, { headers = {}, customFetch, region = FunctionRegion.Any } = {}) {
        this.url = url;
        this.headers = headers;
        this.region = region;
        this.fetch = resolveFetch(customFetch);
      }
      /**
       * Updates the authorization header
       * @param token - the new jwt token sent in the authorisation header
       */
      setAuth(token) {
        this.headers.Authorization = `Bearer ${token}`;
      }
      /**
       * Invokes a function
       * @param functionName - The name of the Function to invoke.
       * @param options - Options for invoking the Function.
       */
      invoke(functionName, options = {}) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
          try {
            const { headers, method, body: functionArgs } = options;
            let _headers = {};
            let { region } = options;
            if (!region) {
              region = this.region;
            }
            const url = new URL(`${this.url}/${functionName}`);
            if (region && region !== "any") {
              _headers["x-region"] = region;
              url.searchParams.set("forceFunctionRegion", region);
            }
            let body2;
            if (functionArgs && (headers && !Object.prototype.hasOwnProperty.call(headers, "Content-Type") || !headers)) {
              if (typeof Blob !== "undefined" && functionArgs instanceof Blob || functionArgs instanceof ArrayBuffer) {
                _headers["Content-Type"] = "application/octet-stream";
                body2 = functionArgs;
              } else if (typeof functionArgs === "string") {
                _headers["Content-Type"] = "text/plain";
                body2 = functionArgs;
              } else if (typeof FormData !== "undefined" && functionArgs instanceof FormData) {
                body2 = functionArgs;
              } else {
                _headers["Content-Type"] = "application/json";
                body2 = JSON.stringify(functionArgs);
              }
            }
            const response = yield this.fetch(url.toString(), {
              method: method || "POST",
              // headers priority is (high to low):
              // 1. invoke-level headers
              // 2. client-level headers
              // 3. default Content-Type header
              headers: Object.assign(Object.assign(Object.assign({}, _headers), this.headers), headers),
              body: body2
            }).catch((fetchError) => {
              throw new FunctionsFetchError(fetchError);
            });
            const isRelayError = response.headers.get("x-relay-error");
            if (isRelayError && isRelayError === "true") {
              throw new FunctionsRelayError(response);
            }
            if (!response.ok) {
              throw new FunctionsHttpError(response);
            }
            let responseType = ((_a = response.headers.get("Content-Type")) !== null && _a !== void 0 ? _a : "text/plain").split(";")[0].trim();
            let data;
            if (responseType === "application/json") {
              data = yield response.json();
            } else if (responseType === "application/octet-stream") {
              data = yield response.blob();
            } else if (responseType === "text/event-stream") {
              data = response;
            } else if (responseType === "multipart/form-data") {
              data = yield response.formData();
            } else {
              data = yield response.text();
            }
            return { data, error: null, response };
          } catch (error) {
            return {
              data: null,
              error,
              response: error instanceof FunctionsHttpError || error instanceof FunctionsRelayError ? error.context : void 0
            };
          }
        });
      }
    };
  }
});

// ../node_modules/@supabase/functions-js/dist/module/index.js
var init_module = __esm({
  "../node_modules/@supabase/functions-js/dist/module/index.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_FunctionsClient();
    init_types();
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError.js
var require_PostgrestError = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestError2 = class extends Error {
      static {
        __name(this, "PostgrestError");
      }
      constructor(context) {
        super(context.message);
        this.name = "PostgrestError";
        this.details = context.details;
        this.hint = context.hint;
        this.code = context.code;
      }
    };
    exports.default = PostgrestError2;
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js
var require_PostgrestBuilder = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var node_fetch_1 = __importDefault((init_browser(), __toCommonJS(browser_exports)));
    var PostgrestError_1 = __importDefault(require_PostgrestError());
    var PostgrestBuilder2 = class {
      static {
        __name(this, "PostgrestBuilder");
      }
      constructor(builder) {
        this.shouldThrowOnError = false;
        this.method = builder.method;
        this.url = builder.url;
        this.headers = builder.headers;
        this.schema = builder.schema;
        this.body = builder.body;
        this.shouldThrowOnError = builder.shouldThrowOnError;
        this.signal = builder.signal;
        this.isMaybeSingle = builder.isMaybeSingle;
        if (builder.fetch) {
          this.fetch = builder.fetch;
        } else if (typeof fetch === "undefined") {
          this.fetch = node_fetch_1.default;
        } else {
          this.fetch = fetch;
        }
      }
      /**
       * If there's an error with the query, throwOnError will reject the promise by
       * throwing the error instead of returning it as part of a successful response.
       *
       * {@link https://github.com/supabase/supabase-js/issues/92}
       */
      throwOnError() {
        this.shouldThrowOnError = true;
        return this;
      }
      /**
       * Set an HTTP header for the request.
       */
      setHeader(name, value) {
        this.headers = Object.assign({}, this.headers);
        this.headers[name] = value;
        return this;
      }
      then(onfulfilled, onrejected) {
        if (this.schema === void 0) {
        } else if (["GET", "HEAD"].includes(this.method)) {
          this.headers["Accept-Profile"] = this.schema;
        } else {
          this.headers["Content-Profile"] = this.schema;
        }
        if (this.method !== "GET" && this.method !== "HEAD") {
          this.headers["Content-Type"] = "application/json";
        }
        const _fetch = this.fetch;
        let res = _fetch(this.url.toString(), {
          method: this.method,
          headers: this.headers,
          body: JSON.stringify(this.body),
          signal: this.signal
        }).then(async (res2) => {
          var _a, _b, _c;
          let error = null;
          let data = null;
          let count = null;
          let status = res2.status;
          let statusText = res2.statusText;
          if (res2.ok) {
            if (this.method !== "HEAD") {
              const body2 = await res2.text();
              if (body2 === "") {
              } else if (this.headers["Accept"] === "text/csv") {
                data = body2;
              } else if (this.headers["Accept"] && this.headers["Accept"].includes("application/vnd.pgrst.plan+text")) {
                data = body2;
              } else {
                data = JSON.parse(body2);
              }
            }
            const countHeader = (_a = this.headers["Prefer"]) === null || _a === void 0 ? void 0 : _a.match(/count=(exact|planned|estimated)/);
            const contentRange = (_b = res2.headers.get("content-range")) === null || _b === void 0 ? void 0 : _b.split("/");
            if (countHeader && contentRange && contentRange.length > 1) {
              count = parseInt(contentRange[1]);
            }
            if (this.isMaybeSingle && this.method === "GET" && Array.isArray(data)) {
              if (data.length > 1) {
                error = {
                  // https://github.com/PostgREST/postgrest/blob/a867d79c42419af16c18c3fb019eba8df992626f/src/PostgREST/Error.hs#L553
                  code: "PGRST116",
                  details: `Results contain ${data.length} rows, application/vnd.pgrst.object+json requires 1 row`,
                  hint: null,
                  message: "JSON object requested, multiple (or no) rows returned"
                };
                data = null;
                count = null;
                status = 406;
                statusText = "Not Acceptable";
              } else if (data.length === 1) {
                data = data[0];
              } else {
                data = null;
              }
            }
          } else {
            const body2 = await res2.text();
            try {
              error = JSON.parse(body2);
              if (Array.isArray(error) && res2.status === 404) {
                data = [];
                error = null;
                status = 200;
                statusText = "OK";
              }
            } catch (_d) {
              if (res2.status === 404 && body2 === "") {
                status = 204;
                statusText = "No Content";
              } else {
                error = {
                  message: body2
                };
              }
            }
            if (error && this.isMaybeSingle && ((_c = error === null || error === void 0 ? void 0 : error.details) === null || _c === void 0 ? void 0 : _c.includes("0 rows"))) {
              error = null;
              status = 200;
              statusText = "OK";
            }
            if (error && this.shouldThrowOnError) {
              throw new PostgrestError_1.default(error);
            }
          }
          const postgrestResponse = {
            error,
            data,
            count,
            status,
            statusText
          };
          return postgrestResponse;
        });
        if (!this.shouldThrowOnError) {
          res = res.catch((fetchError) => {
            var _a, _b, _c;
            return {
              error: {
                message: `${(_a = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _a !== void 0 ? _a : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`,
                details: `${(_b = fetchError === null || fetchError === void 0 ? void 0 : fetchError.stack) !== null && _b !== void 0 ? _b : ""}`,
                hint: "",
                code: `${(_c = fetchError === null || fetchError === void 0 ? void 0 : fetchError.code) !== null && _c !== void 0 ? _c : ""}`
              },
              data: null,
              count: null,
              status: 0,
              statusText: ""
            };
          });
        }
        return res.then(onfulfilled, onrejected);
      }
      /**
       * Override the type of the returned `data`.
       *
       * @typeParam NewResult - The new result type to override with
       * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
       */
      returns() {
        return this;
      }
      /**
       * Override the type of the returned `data` field in the response.
       *
       * @typeParam NewResult - The new type to cast the response data to
       * @typeParam Options - Optional type configuration (defaults to { merge: true })
       * @typeParam Options.merge - When true, merges the new type with existing return type. When false, replaces the existing types entirely (defaults to true)
       * @example
       * ```typescript
       * // Merge with existing types (default behavior)
       * const query = supabase
       *   .from('users')
       *   .select()
       *   .overrideTypes<{ custom_field: string }>()
       *
       * // Replace existing types completely
       * const replaceQuery = supabase
       *   .from('users')
       *   .select()
       *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
       * ```
       * @returns A PostgrestBuilder instance with the new type
       */
      overrideTypes() {
        return this;
      }
    };
    exports.default = PostgrestBuilder2;
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js
var require_PostgrestTransformBuilder = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestBuilder_1 = __importDefault(require_PostgrestBuilder());
    var PostgrestTransformBuilder2 = class extends PostgrestBuilder_1.default {
      static {
        __name(this, "PostgrestTransformBuilder");
      }
      /**
       * Perform a SELECT on the query result.
       *
       * By default, `.insert()`, `.update()`, `.upsert()`, and `.delete()` do not
       * return modified rows. By calling this method, modified rows are returned in
       * `data`.
       *
       * @param columns - The columns to retrieve, separated by commas
       */
      select(columns) {
        let quoted = false;
        const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c2) => {
          if (/\s/.test(c2) && !quoted) {
            return "";
          }
          if (c2 === '"') {
            quoted = !quoted;
          }
          return c2;
        }).join("");
        this.url.searchParams.set("select", cleanedColumns);
        if (this.headers["Prefer"]) {
          this.headers["Prefer"] += ",";
        }
        this.headers["Prefer"] += "return=representation";
        return this;
      }
      /**
       * Order the query result by `column`.
       *
       * You can call this method multiple times to order by multiple columns.
       *
       * You can order referenced tables, but it only affects the ordering of the
       * parent table if you use `!inner` in the query.
       *
       * @param column - The column to order by
       * @param options - Named parameters
       * @param options.ascending - If `true`, the result will be in ascending order
       * @param options.nullsFirst - If `true`, `null`s appear first. If `false`,
       * `null`s appear last.
       * @param options.referencedTable - Set this to order a referenced table by
       * its columns
       * @param options.foreignTable - Deprecated, use `options.referencedTable`
       * instead
       */
      order(column, { ascending = true, nullsFirst, foreignTable, referencedTable = foreignTable } = {}) {
        const key = referencedTable ? `${referencedTable}.order` : "order";
        const existingOrder = this.url.searchParams.get(key);
        this.url.searchParams.set(key, `${existingOrder ? `${existingOrder},` : ""}${column}.${ascending ? "asc" : "desc"}${nullsFirst === void 0 ? "" : nullsFirst ? ".nullsfirst" : ".nullslast"}`);
        return this;
      }
      /**
       * Limit the query result by `count`.
       *
       * @param count - The maximum number of rows to return
       * @param options - Named parameters
       * @param options.referencedTable - Set this to limit rows of referenced
       * tables instead of the parent table
       * @param options.foreignTable - Deprecated, use `options.referencedTable`
       * instead
       */
      limit(count, { foreignTable, referencedTable = foreignTable } = {}) {
        const key = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
        this.url.searchParams.set(key, `${count}`);
        return this;
      }
      /**
       * Limit the query result by starting at an offset `from` and ending at the offset `to`.
       * Only records within this range are returned.
       * This respects the query order and if there is no order clause the range could behave unexpectedly.
       * The `from` and `to` values are 0-based and inclusive: `range(1, 3)` will include the second, third
       * and fourth rows of the query.
       *
       * @param from - The starting index from which to limit the result
       * @param to - The last index to which to limit the result
       * @param options - Named parameters
       * @param options.referencedTable - Set this to limit rows of referenced
       * tables instead of the parent table
       * @param options.foreignTable - Deprecated, use `options.referencedTable`
       * instead
       */
      range(from, to, { foreignTable, referencedTable = foreignTable } = {}) {
        const keyOffset = typeof referencedTable === "undefined" ? "offset" : `${referencedTable}.offset`;
        const keyLimit = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
        this.url.searchParams.set(keyOffset, `${from}`);
        this.url.searchParams.set(keyLimit, `${to - from + 1}`);
        return this;
      }
      /**
       * Set the AbortSignal for the fetch request.
       *
       * @param signal - The AbortSignal to use for the fetch request
       */
      abortSignal(signal) {
        this.signal = signal;
        return this;
      }
      /**
       * Return `data` as a single object instead of an array of objects.
       *
       * Query result must be one row (e.g. using `.limit(1)`), otherwise this
       * returns an error.
       */
      single() {
        this.headers["Accept"] = "application/vnd.pgrst.object+json";
        return this;
      }
      /**
       * Return `data` as a single object instead of an array of objects.
       *
       * Query result must be zero or one row (e.g. using `.limit(1)`), otherwise
       * this returns an error.
       */
      maybeSingle() {
        if (this.method === "GET") {
          this.headers["Accept"] = "application/json";
        } else {
          this.headers["Accept"] = "application/vnd.pgrst.object+json";
        }
        this.isMaybeSingle = true;
        return this;
      }
      /**
       * Return `data` as a string in CSV format.
       */
      csv() {
        this.headers["Accept"] = "text/csv";
        return this;
      }
      /**
       * Return `data` as an object in [GeoJSON](https://geojson.org) format.
       */
      geojson() {
        this.headers["Accept"] = "application/geo+json";
        return this;
      }
      /**
       * Return `data` as the EXPLAIN plan for the query.
       *
       * You need to enable the
       * [db_plan_enabled](https://supabase.com/docs/guides/database/debugging-performance#enabling-explain)
       * setting before using this method.
       *
       * @param options - Named parameters
       *
       * @param options.analyze - If `true`, the query will be executed and the
       * actual run time will be returned
       *
       * @param options.verbose - If `true`, the query identifier will be returned
       * and `data` will include the output columns of the query
       *
       * @param options.settings - If `true`, include information on configuration
       * parameters that affect query planning
       *
       * @param options.buffers - If `true`, include information on buffer usage
       *
       * @param options.wal - If `true`, include information on WAL record generation
       *
       * @param options.format - The format of the output, can be `"text"` (default)
       * or `"json"`
       */
      explain({ analyze = false, verbose = false, settings = false, buffers = false, wal = false, format = "text" } = {}) {
        var _a;
        const options = [
          analyze ? "analyze" : null,
          verbose ? "verbose" : null,
          settings ? "settings" : null,
          buffers ? "buffers" : null,
          wal ? "wal" : null
        ].filter(Boolean).join("|");
        const forMediatype = (_a = this.headers["Accept"]) !== null && _a !== void 0 ? _a : "application/json";
        this.headers["Accept"] = `application/vnd.pgrst.plan+${format}; for="${forMediatype}"; options=${options};`;
        if (format === "json")
          return this;
        else
          return this;
      }
      /**
       * Rollback the query.
       *
       * `data` will still be returned, but the query is not committed.
       */
      rollback() {
        var _a;
        if (((_a = this.headers["Prefer"]) !== null && _a !== void 0 ? _a : "").trim().length > 0) {
          this.headers["Prefer"] += ",tx=rollback";
        } else {
          this.headers["Prefer"] = "tx=rollback";
        }
        return this;
      }
      /**
       * Override the type of the returned `data`.
       *
       * @typeParam NewResult - The new result type to override with
       * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
       */
      returns() {
        return this;
      }
    };
    exports.default = PostgrestTransformBuilder2;
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js
var require_PostgrestFilterBuilder = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestTransformBuilder_1 = __importDefault(require_PostgrestTransformBuilder());
    var PostgrestFilterBuilder2 = class extends PostgrestTransformBuilder_1.default {
      static {
        __name(this, "PostgrestFilterBuilder");
      }
      /**
       * Match only rows where `column` is equal to `value`.
       *
       * To check if the value of `column` is NULL, you should use `.is()` instead.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      eq(column, value) {
        this.url.searchParams.append(column, `eq.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is not equal to `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      neq(column, value) {
        this.url.searchParams.append(column, `neq.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is greater than `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      gt(column, value) {
        this.url.searchParams.append(column, `gt.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is greater than or equal to `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      gte(column, value) {
        this.url.searchParams.append(column, `gte.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is less than `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      lt(column, value) {
        this.url.searchParams.append(column, `lt.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is less than or equal to `value`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      lte(column, value) {
        this.url.searchParams.append(column, `lte.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` matches `pattern` case-sensitively.
       *
       * @param column - The column to filter on
       * @param pattern - The pattern to match with
       */
      like(column, pattern) {
        this.url.searchParams.append(column, `like.${pattern}`);
        return this;
      }
      /**
       * Match only rows where `column` matches all of `patterns` case-sensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      likeAllOf(column, patterns) {
        this.url.searchParams.append(column, `like(all).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` matches any of `patterns` case-sensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      likeAnyOf(column, patterns) {
        this.url.searchParams.append(column, `like(any).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` matches `pattern` case-insensitively.
       *
       * @param column - The column to filter on
       * @param pattern - The pattern to match with
       */
      ilike(column, pattern) {
        this.url.searchParams.append(column, `ilike.${pattern}`);
        return this;
      }
      /**
       * Match only rows where `column` matches all of `patterns` case-insensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      ilikeAllOf(column, patterns) {
        this.url.searchParams.append(column, `ilike(all).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` matches any of `patterns` case-insensitively.
       *
       * @param column - The column to filter on
       * @param patterns - The patterns to match with
       */
      ilikeAnyOf(column, patterns) {
        this.url.searchParams.append(column, `ilike(any).{${patterns.join(",")}}`);
        return this;
      }
      /**
       * Match only rows where `column` IS `value`.
       *
       * For non-boolean columns, this is only relevant for checking if the value of
       * `column` is NULL by setting `value` to `null`.
       *
       * For boolean columns, you can also set `value` to `true` or `false` and it
       * will behave the same way as `.eq()`.
       *
       * @param column - The column to filter on
       * @param value - The value to filter with
       */
      is(column, value) {
        this.url.searchParams.append(column, `is.${value}`);
        return this;
      }
      /**
       * Match only rows where `column` is included in the `values` array.
       *
       * @param column - The column to filter on
       * @param values - The values array to filter with
       */
      in(column, values) {
        const cleanedValues = Array.from(new Set(values)).map((s2) => {
          if (typeof s2 === "string" && new RegExp("[,()]").test(s2))
            return `"${s2}"`;
          else
            return `${s2}`;
        }).join(",");
        this.url.searchParams.append(column, `in.(${cleanedValues})`);
        return this;
      }
      /**
       * Only relevant for jsonb, array, and range columns. Match only rows where
       * `column` contains every element appearing in `value`.
       *
       * @param column - The jsonb, array, or range column to filter on
       * @param value - The jsonb, array, or range value to filter with
       */
      contains(column, value) {
        if (typeof value === "string") {
          this.url.searchParams.append(column, `cs.${value}`);
        } else if (Array.isArray(value)) {
          this.url.searchParams.append(column, `cs.{${value.join(",")}}`);
        } else {
          this.url.searchParams.append(column, `cs.${JSON.stringify(value)}`);
        }
        return this;
      }
      /**
       * Only relevant for jsonb, array, and range columns. Match only rows where
       * every element appearing in `column` is contained by `value`.
       *
       * @param column - The jsonb, array, or range column to filter on
       * @param value - The jsonb, array, or range value to filter with
       */
      containedBy(column, value) {
        if (typeof value === "string") {
          this.url.searchParams.append(column, `cd.${value}`);
        } else if (Array.isArray(value)) {
          this.url.searchParams.append(column, `cd.{${value.join(",")}}`);
        } else {
          this.url.searchParams.append(column, `cd.${JSON.stringify(value)}`);
        }
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is greater than any element in `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeGt(column, range) {
        this.url.searchParams.append(column, `sr.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is either contained in `range` or greater than any element in
       * `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeGte(column, range) {
        this.url.searchParams.append(column, `nxl.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is less than any element in `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeLt(column, range) {
        this.url.searchParams.append(column, `sl.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where every element in
       * `column` is either contained in `range` or less than any element in
       * `range`.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeLte(column, range) {
        this.url.searchParams.append(column, `nxr.${range}`);
        return this;
      }
      /**
       * Only relevant for range columns. Match only rows where `column` is
       * mutually exclusive to `range` and there can be no element between the two
       * ranges.
       *
       * @param column - The range column to filter on
       * @param range - The range to filter with
       */
      rangeAdjacent(column, range) {
        this.url.searchParams.append(column, `adj.${range}`);
        return this;
      }
      /**
       * Only relevant for array and range columns. Match only rows where
       * `column` and `value` have an element in common.
       *
       * @param column - The array or range column to filter on
       * @param value - The array or range value to filter with
       */
      overlaps(column, value) {
        if (typeof value === "string") {
          this.url.searchParams.append(column, `ov.${value}`);
        } else {
          this.url.searchParams.append(column, `ov.{${value.join(",")}}`);
        }
        return this;
      }
      /**
       * Only relevant for text and tsvector columns. Match only rows where
       * `column` matches the query string in `query`.
       *
       * @param column - The text or tsvector column to filter on
       * @param query - The query text to match with
       * @param options - Named parameters
       * @param options.config - The text search configuration to use
       * @param options.type - Change how the `query` text is interpreted
       */
      textSearch(column, query, { config, type } = {}) {
        let typePart = "";
        if (type === "plain") {
          typePart = "pl";
        } else if (type === "phrase") {
          typePart = "ph";
        } else if (type === "websearch") {
          typePart = "w";
        }
        const configPart = config === void 0 ? "" : `(${config})`;
        this.url.searchParams.append(column, `${typePart}fts${configPart}.${query}`);
        return this;
      }
      /**
       * Match only rows where each column in `query` keys is equal to its
       * associated value. Shorthand for multiple `.eq()`s.
       *
       * @param query - The object to filter with, with column names as keys mapped
       * to their filter values
       */
      match(query) {
        Object.entries(query).forEach(([column, value]) => {
          this.url.searchParams.append(column, `eq.${value}`);
        });
        return this;
      }
      /**
       * Match only rows which doesn't satisfy the filter.
       *
       * Unlike most filters, `opearator` and `value` are used as-is and need to
       * follow [PostgREST
       * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
       * to make sure they are properly sanitized.
       *
       * @param column - The column to filter on
       * @param operator - The operator to be negated to filter with, following
       * PostgREST syntax
       * @param value - The value to filter with, following PostgREST syntax
       */
      not(column, operator, value) {
        this.url.searchParams.append(column, `not.${operator}.${value}`);
        return this;
      }
      /**
       * Match only rows which satisfy at least one of the filters.
       *
       * Unlike most filters, `filters` is used as-is and needs to follow [PostgREST
       * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
       * to make sure it's properly sanitized.
       *
       * It's currently not possible to do an `.or()` filter across multiple tables.
       *
       * @param filters - The filters to use, following PostgREST syntax
       * @param options - Named parameters
       * @param options.referencedTable - Set this to filter on referenced tables
       * instead of the parent table
       * @param options.foreignTable - Deprecated, use `referencedTable` instead
       */
      or(filters, { foreignTable, referencedTable = foreignTable } = {}) {
        const key = referencedTable ? `${referencedTable}.or` : "or";
        this.url.searchParams.append(key, `(${filters})`);
        return this;
      }
      /**
       * Match only rows which satisfy the filter. This is an escape hatch - you
       * should use the specific filter methods wherever possible.
       *
       * Unlike most filters, `opearator` and `value` are used as-is and need to
       * follow [PostgREST
       * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
       * to make sure they are properly sanitized.
       *
       * @param column - The column to filter on
       * @param operator - The operator to filter with, following PostgREST syntax
       * @param value - The value to filter with, following PostgREST syntax
       */
      filter(column, operator, value) {
        this.url.searchParams.append(column, `${operator}.${value}`);
        return this;
      }
    };
    exports.default = PostgrestFilterBuilder2;
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestQueryBuilder.js
var require_PostgrestQueryBuilder = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestQueryBuilder.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
    var PostgrestQueryBuilder2 = class {
      static {
        __name(this, "PostgrestQueryBuilder");
      }
      constructor(url, { headers = {}, schema, fetch: fetch3 }) {
        this.url = url;
        this.headers = headers;
        this.schema = schema;
        this.fetch = fetch3;
      }
      /**
       * Perform a SELECT query on the table or view.
       *
       * @param columns - The columns to retrieve, separated by commas. Columns can be renamed when returned with `customName:columnName`
       *
       * @param options - Named parameters
       *
       * @param options.head - When set to `true`, `data` will not be returned.
       * Useful if you only need the count.
       *
       * @param options.count - Count algorithm to use to count rows in the table or view.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      select(columns, { head: head2 = false, count } = {}) {
        const method = head2 ? "HEAD" : "GET";
        let quoted = false;
        const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c2) => {
          if (/\s/.test(c2) && !quoted) {
            return "";
          }
          if (c2 === '"') {
            quoted = !quoted;
          }
          return c2;
        }).join("");
        this.url.searchParams.set("select", cleanedColumns);
        if (count) {
          this.headers["Prefer"] = `count=${count}`;
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          fetch: this.fetch,
          allowEmpty: false
        });
      }
      /**
       * Perform an INSERT into the table or view.
       *
       * By default, inserted rows are not returned. To return it, chain the call
       * with `.select()`.
       *
       * @param values - The values to insert. Pass an object to insert a single row
       * or an array to insert multiple rows.
       *
       * @param options - Named parameters
       *
       * @param options.count - Count algorithm to use to count inserted rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       *
       * @param options.defaultToNull - Make missing fields default to `null`.
       * Otherwise, use the default value for the column. Only applies for bulk
       * inserts.
       */
      insert(values, { count, defaultToNull = true } = {}) {
        const method = "POST";
        const prefersHeaders = [];
        if (this.headers["Prefer"]) {
          prefersHeaders.push(this.headers["Prefer"]);
        }
        if (count) {
          prefersHeaders.push(`count=${count}`);
        }
        if (!defaultToNull) {
          prefersHeaders.push("missing=default");
        }
        this.headers["Prefer"] = prefersHeaders.join(",");
        if (Array.isArray(values)) {
          const columns = values.reduce((acc, x2) => acc.concat(Object.keys(x2)), []);
          if (columns.length > 0) {
            const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
            this.url.searchParams.set("columns", uniqueColumns.join(","));
          }
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          body: values,
          fetch: this.fetch,
          allowEmpty: false
        });
      }
      /**
       * Perform an UPSERT on the table or view. Depending on the column(s) passed
       * to `onConflict`, `.upsert()` allows you to perform the equivalent of
       * `.insert()` if a row with the corresponding `onConflict` columns doesn't
       * exist, or if it does exist, perform an alternative action depending on
       * `ignoreDuplicates`.
       *
       * By default, upserted rows are not returned. To return it, chain the call
       * with `.select()`.
       *
       * @param values - The values to upsert with. Pass an object to upsert a
       * single row or an array to upsert multiple rows.
       *
       * @param options - Named parameters
       *
       * @param options.onConflict - Comma-separated UNIQUE column(s) to specify how
       * duplicate rows are determined. Two rows are duplicates if all the
       * `onConflict` columns are equal.
       *
       * @param options.ignoreDuplicates - If `true`, duplicate rows are ignored. If
       * `false`, duplicate rows are merged with existing rows.
       *
       * @param options.count - Count algorithm to use to count upserted rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       *
       * @param options.defaultToNull - Make missing fields default to `null`.
       * Otherwise, use the default value for the column. This only applies when
       * inserting new rows, not when merging with existing rows under
       * `ignoreDuplicates: false`. This also only applies when doing bulk upserts.
       */
      upsert(values, { onConflict, ignoreDuplicates = false, count, defaultToNull = true } = {}) {
        const method = "POST";
        const prefersHeaders = [`resolution=${ignoreDuplicates ? "ignore" : "merge"}-duplicates`];
        if (onConflict !== void 0)
          this.url.searchParams.set("on_conflict", onConflict);
        if (this.headers["Prefer"]) {
          prefersHeaders.push(this.headers["Prefer"]);
        }
        if (count) {
          prefersHeaders.push(`count=${count}`);
        }
        if (!defaultToNull) {
          prefersHeaders.push("missing=default");
        }
        this.headers["Prefer"] = prefersHeaders.join(",");
        if (Array.isArray(values)) {
          const columns = values.reduce((acc, x2) => acc.concat(Object.keys(x2)), []);
          if (columns.length > 0) {
            const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
            this.url.searchParams.set("columns", uniqueColumns.join(","));
          }
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          body: values,
          fetch: this.fetch,
          allowEmpty: false
        });
      }
      /**
       * Perform an UPDATE on the table or view.
       *
       * By default, updated rows are not returned. To return it, chain the call
       * with `.select()` after filters.
       *
       * @param values - The values to update with
       *
       * @param options - Named parameters
       *
       * @param options.count - Count algorithm to use to count updated rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      update(values, { count } = {}) {
        const method = "PATCH";
        const prefersHeaders = [];
        if (this.headers["Prefer"]) {
          prefersHeaders.push(this.headers["Prefer"]);
        }
        if (count) {
          prefersHeaders.push(`count=${count}`);
        }
        this.headers["Prefer"] = prefersHeaders.join(",");
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          body: values,
          fetch: this.fetch,
          allowEmpty: false
        });
      }
      /**
       * Perform a DELETE on the table or view.
       *
       * By default, deleted rows are not returned. To return it, chain the call
       * with `.select()` after filters.
       *
       * @param options - Named parameters
       *
       * @param options.count - Count algorithm to use to count deleted rows.
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      delete({ count } = {}) {
        const method = "DELETE";
        const prefersHeaders = [];
        if (count) {
          prefersHeaders.push(`count=${count}`);
        }
        if (this.headers["Prefer"]) {
          prefersHeaders.unshift(this.headers["Prefer"]);
        }
        this.headers["Prefer"] = prefersHeaders.join(",");
        return new PostgrestFilterBuilder_1.default({
          method,
          url: this.url,
          headers: this.headers,
          schema: this.schema,
          fetch: this.fetch,
          allowEmpty: false
        });
      }
    };
    exports.default = PostgrestQueryBuilder2;
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/version.js
var require_version = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/version.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.version = void 0;
    exports.version = "0.0.0-automated";
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/constants.js
var require_constants = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/constants.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_HEADERS = void 0;
    var version_1 = require_version();
    exports.DEFAULT_HEADERS = { "X-Client-Info": `postgrest-js/${version_1.version}` };
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js
var require_PostgrestClient = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var PostgrestQueryBuilder_1 = __importDefault(require_PostgrestQueryBuilder());
    var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
    var constants_1 = require_constants();
    var PostgrestClient2 = class _PostgrestClient {
      static {
        __name(this, "PostgrestClient");
      }
      // TODO: Add back shouldThrowOnError once we figure out the typings
      /**
       * Creates a PostgREST client.
       *
       * @param url - URL of the PostgREST endpoint
       * @param options - Named parameters
       * @param options.headers - Custom headers
       * @param options.schema - Postgres schema to switch to
       * @param options.fetch - Custom fetch
       */
      constructor(url, { headers = {}, schema, fetch: fetch3 } = {}) {
        this.url = url;
        this.headers = Object.assign(Object.assign({}, constants_1.DEFAULT_HEADERS), headers);
        this.schemaName = schema;
        this.fetch = fetch3;
      }
      /**
       * Perform a query on a table or a view.
       *
       * @param relation - The table or view name to query
       */
      from(relation) {
        const url = new URL(`${this.url}/${relation}`);
        return new PostgrestQueryBuilder_1.default(url, {
          headers: Object.assign({}, this.headers),
          schema: this.schemaName,
          fetch: this.fetch
        });
      }
      /**
       * Select a schema to query or perform an function (rpc) call.
       *
       * The schema needs to be on the list of exposed schemas inside Supabase.
       *
       * @param schema - The schema to query
       */
      schema(schema) {
        return new _PostgrestClient(this.url, {
          headers: this.headers,
          schema,
          fetch: this.fetch
        });
      }
      /**
       * Perform a function call.
       *
       * @param fn - The function name to call
       * @param args - The arguments to pass to the function call
       * @param options - Named parameters
       * @param options.head - When set to `true`, `data` will not be returned.
       * Useful if you only need the count.
       * @param options.get - When set to `true`, the function will be called with
       * read-only access mode.
       * @param options.count - Count algorithm to use to count rows returned by the
       * function. Only applicable for [set-returning
       * functions](https://www.postgresql.org/docs/current/functions-srf.html).
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      rpc(fn, args = {}, { head: head2 = false, get: get2 = false, count } = {}) {
        let method;
        const url = new URL(`${this.url}/rpc/${fn}`);
        let body2;
        if (head2 || get2) {
          method = head2 ? "HEAD" : "GET";
          Object.entries(args).filter(([_2, value]) => value !== void 0).map(([name, value]) => [name, Array.isArray(value) ? `{${value.join(",")}}` : `${value}`]).forEach(([name, value]) => {
            url.searchParams.append(name, value);
          });
        } else {
          method = "POST";
          body2 = args;
        }
        const headers = Object.assign({}, this.headers);
        if (count) {
          headers["Prefer"] = `count=${count}`;
        }
        return new PostgrestFilterBuilder_1.default({
          method,
          url,
          headers,
          schema: this.schemaName,
          body: body2,
          fetch: this.fetch,
          allowEmpty: false
        });
      }
    };
    exports.default = PostgrestClient2;
  }
});

// ../node_modules/@supabase/postgrest-js/dist/cjs/index.js
var require_cjs = __commonJS({
  "../node_modules/@supabase/postgrest-js/dist/cjs/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_6071133848472854();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PostgrestError = exports.PostgrestBuilder = exports.PostgrestTransformBuilder = exports.PostgrestFilterBuilder = exports.PostgrestQueryBuilder = exports.PostgrestClient = void 0;
    var PostgrestClient_1 = __importDefault(require_PostgrestClient());
    exports.PostgrestClient = PostgrestClient_1.default;
    var PostgrestQueryBuilder_1 = __importDefault(require_PostgrestQueryBuilder());
    exports.PostgrestQueryBuilder = PostgrestQueryBuilder_1.default;
    var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
    exports.PostgrestFilterBuilder = PostgrestFilterBuilder_1.default;
    var PostgrestTransformBuilder_1 = __importDefault(require_PostgrestTransformBuilder());
    exports.PostgrestTransformBuilder = PostgrestTransformBuilder_1.default;
    var PostgrestBuilder_1 = __importDefault(require_PostgrestBuilder());
    exports.PostgrestBuilder = PostgrestBuilder_1.default;
    var PostgrestError_1 = __importDefault(require_PostgrestError());
    exports.PostgrestError = PostgrestError_1.default;
    exports.default = {
      PostgrestClient: PostgrestClient_1.default,
      PostgrestQueryBuilder: PostgrestQueryBuilder_1.default,
      PostgrestFilterBuilder: PostgrestFilterBuilder_1.default,
      PostgrestTransformBuilder: PostgrestTransformBuilder_1.default,
      PostgrestBuilder: PostgrestBuilder_1.default,
      PostgrestError: PostgrestError_1.default
    };
  }
});

// ../node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs
var import_cjs, PostgrestClient, PostgrestQueryBuilder, PostgrestFilterBuilder, PostgrestTransformBuilder, PostgrestBuilder, PostgrestError;
var init_wrapper = __esm({
  "../node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs"() {
    init_functionsRoutes_0_6071133848472854();
    import_cjs = __toESM(require_cjs(), 1);
    ({
      PostgrestClient,
      PostgrestQueryBuilder,
      PostgrestFilterBuilder,
      PostgrestTransformBuilder,
      PostgrestBuilder,
      PostgrestError
    } = import_cjs.default);
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js
var WebSocketFactory, websocket_factory_default;
var init_websocket_factory = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/websocket-factory.js"() {
    init_functionsRoutes_0_6071133848472854();
    WebSocketFactory = class {
      static {
        __name(this, "WebSocketFactory");
      }
      static detectEnvironment() {
        var _a;
        if (typeof WebSocket !== "undefined") {
          return { type: "native", constructor: WebSocket };
        }
        if (typeof globalThis !== "undefined" && typeof globalThis.WebSocket !== "undefined") {
          return { type: "native", constructor: globalThis.WebSocket };
        }
        if (typeof global !== "undefined" && typeof global.WebSocket !== "undefined") {
          return { type: "native", constructor: global.WebSocket };
        }
        if (typeof globalThis !== "undefined" && typeof globalThis.WebSocketPair !== "undefined" && typeof globalThis.WebSocket === "undefined") {
          return {
            type: "cloudflare",
            error: "Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.",
            workaround: "Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime."
          };
        }
        if (typeof globalThis !== "undefined" && globalThis.EdgeRuntime || typeof navigator !== "undefined" && ((_a = navigator.userAgent) === null || _a === void 0 ? void 0 : _a.includes("Vercel-Edge"))) {
          return {
            type: "unsupported",
            error: "Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.",
            workaround: "Use serverless functions or a different deployment target for WebSocket functionality."
          };
        }
        if (typeof process !== "undefined" && process.versions && process.versions.node) {
          const nodeVersion = parseInt(process.versions.node.split(".")[0]);
          if (nodeVersion >= 22) {
            if (typeof globalThis.WebSocket !== "undefined") {
              return { type: "native", constructor: globalThis.WebSocket };
            }
            return {
              type: "unsupported",
              error: `Node.js ${nodeVersion} detected but native WebSocket not found.`,
              workaround: "Provide a WebSocket implementation via the transport option."
            };
          }
          return {
            type: "unsupported",
            error: `Node.js ${nodeVersion} detected without native WebSocket support.`,
            workaround: 'For Node.js < 22, install "ws" package and provide it via the transport option:\nimport ws from "ws"\nnew RealtimeClient(url, { transport: ws })'
          };
        }
        return {
          type: "unsupported",
          error: "Unknown JavaScript runtime without WebSocket support.",
          workaround: "Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation."
        };
      }
      static getWebSocketConstructor() {
        const env = this.detectEnvironment();
        if (env.constructor) {
          return env.constructor;
        }
        let errorMessage = env.error || "WebSocket not supported in this environment.";
        if (env.workaround) {
          errorMessage += `

Suggested solution: ${env.workaround}`;
        }
        throw new Error(errorMessage);
      }
      static createWebSocket(url, protocols) {
        const WS = this.getWebSocketConstructor();
        return new WS(url, protocols);
      }
      static isWebSocketSupported() {
        try {
          const env = this.detectEnvironment();
          return env.type === "native" || env.type === "ws";
        } catch (_a) {
          return false;
        }
      }
    };
    websocket_factory_default = WebSocketFactory;
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/version.js
var version;
var init_version = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/version.js"() {
    init_functionsRoutes_0_6071133848472854();
    version = "2.15.1";
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/constants.js
var DEFAULT_VERSION, VSN, DEFAULT_TIMEOUT, WS_CLOSE_NORMAL, MAX_PUSH_BUFFER_SIZE, SOCKET_STATES, CHANNEL_STATES, CHANNEL_EVENTS, TRANSPORTS, CONNECTION_STATE;
var init_constants = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/constants.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_version();
    DEFAULT_VERSION = `realtime-js/${version}`;
    VSN = "1.0.0";
    DEFAULT_TIMEOUT = 1e4;
    WS_CLOSE_NORMAL = 1e3;
    MAX_PUSH_BUFFER_SIZE = 100;
    (function(SOCKET_STATES2) {
      SOCKET_STATES2[SOCKET_STATES2["connecting"] = 0] = "connecting";
      SOCKET_STATES2[SOCKET_STATES2["open"] = 1] = "open";
      SOCKET_STATES2[SOCKET_STATES2["closing"] = 2] = "closing";
      SOCKET_STATES2[SOCKET_STATES2["closed"] = 3] = "closed";
    })(SOCKET_STATES || (SOCKET_STATES = {}));
    (function(CHANNEL_STATES2) {
      CHANNEL_STATES2["closed"] = "closed";
      CHANNEL_STATES2["errored"] = "errored";
      CHANNEL_STATES2["joined"] = "joined";
      CHANNEL_STATES2["joining"] = "joining";
      CHANNEL_STATES2["leaving"] = "leaving";
    })(CHANNEL_STATES || (CHANNEL_STATES = {}));
    (function(CHANNEL_EVENTS2) {
      CHANNEL_EVENTS2["close"] = "phx_close";
      CHANNEL_EVENTS2["error"] = "phx_error";
      CHANNEL_EVENTS2["join"] = "phx_join";
      CHANNEL_EVENTS2["reply"] = "phx_reply";
      CHANNEL_EVENTS2["leave"] = "phx_leave";
      CHANNEL_EVENTS2["access_token"] = "access_token";
    })(CHANNEL_EVENTS || (CHANNEL_EVENTS = {}));
    (function(TRANSPORTS2) {
      TRANSPORTS2["websocket"] = "websocket";
    })(TRANSPORTS || (TRANSPORTS = {}));
    (function(CONNECTION_STATE2) {
      CONNECTION_STATE2["Connecting"] = "connecting";
      CONNECTION_STATE2["Open"] = "open";
      CONNECTION_STATE2["Closing"] = "closing";
      CONNECTION_STATE2["Closed"] = "closed";
    })(CONNECTION_STATE || (CONNECTION_STATE = {}));
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/serializer.js
var Serializer;
var init_serializer = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/serializer.js"() {
    init_functionsRoutes_0_6071133848472854();
    Serializer = class {
      static {
        __name(this, "Serializer");
      }
      constructor() {
        this.HEADER_LENGTH = 1;
      }
      decode(rawPayload, callback) {
        if (rawPayload.constructor === ArrayBuffer) {
          return callback(this._binaryDecode(rawPayload));
        }
        if (typeof rawPayload === "string") {
          return callback(JSON.parse(rawPayload));
        }
        return callback({});
      }
      _binaryDecode(buffer) {
        const view = new DataView(buffer);
        const decoder = new TextDecoder();
        return this._decodeBroadcast(buffer, view, decoder);
      }
      _decodeBroadcast(buffer, view, decoder) {
        const topicSize = view.getUint8(1);
        const eventSize = view.getUint8(2);
        let offset = this.HEADER_LENGTH + 2;
        const topic = decoder.decode(buffer.slice(offset, offset + topicSize));
        offset = offset + topicSize;
        const event = decoder.decode(buffer.slice(offset, offset + eventSize));
        offset = offset + eventSize;
        const data = JSON.parse(decoder.decode(buffer.slice(offset, buffer.byteLength)));
        return { ref: null, topic, event, payload: data };
      }
    };
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/timer.js
var Timer;
var init_timer = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/timer.js"() {
    init_functionsRoutes_0_6071133848472854();
    Timer = class {
      static {
        __name(this, "Timer");
      }
      constructor(callback, timerCalc) {
        this.callback = callback;
        this.timerCalc = timerCalc;
        this.timer = void 0;
        this.tries = 0;
        this.callback = callback;
        this.timerCalc = timerCalc;
      }
      reset() {
        this.tries = 0;
        clearTimeout(this.timer);
        this.timer = void 0;
      }
      // Cancels any previous scheduleTimeout and schedules callback
      scheduleTimeout() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.tries = this.tries + 1;
          this.callback();
        }, this.timerCalc(this.tries + 1));
      }
    };
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/transformers.js
var PostgresTypes, convertChangeData, convertColumn, convertCell, noop, toBoolean, toNumber, toJson, toArray, toTimestampString, httpEndpointURL;
var init_transformers = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/transformers.js"() {
    init_functionsRoutes_0_6071133848472854();
    (function(PostgresTypes2) {
      PostgresTypes2["abstime"] = "abstime";
      PostgresTypes2["bool"] = "bool";
      PostgresTypes2["date"] = "date";
      PostgresTypes2["daterange"] = "daterange";
      PostgresTypes2["float4"] = "float4";
      PostgresTypes2["float8"] = "float8";
      PostgresTypes2["int2"] = "int2";
      PostgresTypes2["int4"] = "int4";
      PostgresTypes2["int4range"] = "int4range";
      PostgresTypes2["int8"] = "int8";
      PostgresTypes2["int8range"] = "int8range";
      PostgresTypes2["json"] = "json";
      PostgresTypes2["jsonb"] = "jsonb";
      PostgresTypes2["money"] = "money";
      PostgresTypes2["numeric"] = "numeric";
      PostgresTypes2["oid"] = "oid";
      PostgresTypes2["reltime"] = "reltime";
      PostgresTypes2["text"] = "text";
      PostgresTypes2["time"] = "time";
      PostgresTypes2["timestamp"] = "timestamp";
      PostgresTypes2["timestamptz"] = "timestamptz";
      PostgresTypes2["timetz"] = "timetz";
      PostgresTypes2["tsrange"] = "tsrange";
      PostgresTypes2["tstzrange"] = "tstzrange";
    })(PostgresTypes || (PostgresTypes = {}));
    convertChangeData = /* @__PURE__ */ __name((columns, record, options = {}) => {
      var _a;
      const skipTypes = (_a = options.skipTypes) !== null && _a !== void 0 ? _a : [];
      return Object.keys(record).reduce((acc, rec_key) => {
        acc[rec_key] = convertColumn(rec_key, columns, record, skipTypes);
        return acc;
      }, {});
    }, "convertChangeData");
    convertColumn = /* @__PURE__ */ __name((columnName, columns, record, skipTypes) => {
      const column = columns.find((x2) => x2.name === columnName);
      const colType = column === null || column === void 0 ? void 0 : column.type;
      const value = record[columnName];
      if (colType && !skipTypes.includes(colType)) {
        return convertCell(colType, value);
      }
      return noop(value);
    }, "convertColumn");
    convertCell = /* @__PURE__ */ __name((type, value) => {
      if (type.charAt(0) === "_") {
        const dataType = type.slice(1, type.length);
        return toArray(value, dataType);
      }
      switch (type) {
        case PostgresTypes.bool:
          return toBoolean(value);
        case PostgresTypes.float4:
        case PostgresTypes.float8:
        case PostgresTypes.int2:
        case PostgresTypes.int4:
        case PostgresTypes.int8:
        case PostgresTypes.numeric:
        case PostgresTypes.oid:
          return toNumber(value);
        case PostgresTypes.json:
        case PostgresTypes.jsonb:
          return toJson(value);
        case PostgresTypes.timestamp:
          return toTimestampString(value);
        // Format to be consistent with PostgREST
        case PostgresTypes.abstime:
        // To allow users to cast it based on Timezone
        case PostgresTypes.date:
        // To allow users to cast it based on Timezone
        case PostgresTypes.daterange:
        case PostgresTypes.int4range:
        case PostgresTypes.int8range:
        case PostgresTypes.money:
        case PostgresTypes.reltime:
        // To allow users to cast it based on Timezone
        case PostgresTypes.text:
        case PostgresTypes.time:
        // To allow users to cast it based on Timezone
        case PostgresTypes.timestamptz:
        // To allow users to cast it based on Timezone
        case PostgresTypes.timetz:
        // To allow users to cast it based on Timezone
        case PostgresTypes.tsrange:
        case PostgresTypes.tstzrange:
          return noop(value);
        default:
          return noop(value);
      }
    }, "convertCell");
    noop = /* @__PURE__ */ __name((value) => {
      return value;
    }, "noop");
    toBoolean = /* @__PURE__ */ __name((value) => {
      switch (value) {
        case "t":
          return true;
        case "f":
          return false;
        default:
          return value;
      }
    }, "toBoolean");
    toNumber = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        const parsedValue = parseFloat(value);
        if (!Number.isNaN(parsedValue)) {
          return parsedValue;
        }
      }
      return value;
    }, "toNumber");
    toJson = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.log(`JSON parse error: ${error}`);
          return value;
        }
      }
      return value;
    }, "toJson");
    toArray = /* @__PURE__ */ __name((value, type) => {
      if (typeof value !== "string") {
        return value;
      }
      const lastIdx = value.length - 1;
      const closeBrace = value[lastIdx];
      const openBrace = value[0];
      if (openBrace === "{" && closeBrace === "}") {
        let arr;
        const valTrim = value.slice(1, lastIdx);
        try {
          arr = JSON.parse("[" + valTrim + "]");
        } catch (_2) {
          arr = valTrim ? valTrim.split(",") : [];
        }
        return arr.map((val) => convertCell(type, val));
      }
      return value;
    }, "toArray");
    toTimestampString = /* @__PURE__ */ __name((value) => {
      if (typeof value === "string") {
        return value.replace(" ", "T");
      }
      return value;
    }, "toTimestampString");
    httpEndpointURL = /* @__PURE__ */ __name((socketUrl) => {
      let url = socketUrl;
      url = url.replace(/^ws/i, "http");
      url = url.replace(/(\/socket\/websocket|\/socket|\/websocket)\/?$/i, "");
      return url.replace(/\/+$/, "") + "/api/broadcast";
    }, "httpEndpointURL");
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/lib/push.js
var Push;
var init_push = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/lib/push.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_constants();
    Push = class {
      static {
        __name(this, "Push");
      }
      /**
       * Initializes the Push
       *
       * @param channel The Channel
       * @param event The event, for example `"phx_join"`
       * @param payload The payload, for example `{user_id: 123}`
       * @param timeout The push timeout in milliseconds
       */
      constructor(channel, event, payload = {}, timeout = DEFAULT_TIMEOUT) {
        this.channel = channel;
        this.event = event;
        this.payload = payload;
        this.timeout = timeout;
        this.sent = false;
        this.timeoutTimer = void 0;
        this.ref = "";
        this.receivedResp = null;
        this.recHooks = [];
        this.refEvent = null;
      }
      resend(timeout) {
        this.timeout = timeout;
        this._cancelRefEvent();
        this.ref = "";
        this.refEvent = null;
        this.receivedResp = null;
        this.sent = false;
        this.send();
      }
      send() {
        if (this._hasReceived("timeout")) {
          return;
        }
        this.startTimeout();
        this.sent = true;
        this.channel.socket.push({
          topic: this.channel.topic,
          event: this.event,
          payload: this.payload,
          ref: this.ref,
          join_ref: this.channel._joinRef()
        });
      }
      updatePayload(payload) {
        this.payload = Object.assign(Object.assign({}, this.payload), payload);
      }
      receive(status, callback) {
        var _a;
        if (this._hasReceived(status)) {
          callback((_a = this.receivedResp) === null || _a === void 0 ? void 0 : _a.response);
        }
        this.recHooks.push({ status, callback });
        return this;
      }
      startTimeout() {
        if (this.timeoutTimer) {
          return;
        }
        this.ref = this.channel.socket._makeRef();
        this.refEvent = this.channel._replyEventName(this.ref);
        const callback = /* @__PURE__ */ __name((payload) => {
          this._cancelRefEvent();
          this._cancelTimeout();
          this.receivedResp = payload;
          this._matchReceive(payload);
        }, "callback");
        this.channel._on(this.refEvent, {}, callback);
        this.timeoutTimer = setTimeout(() => {
          this.trigger("timeout", {});
        }, this.timeout);
      }
      trigger(status, response) {
        if (this.refEvent)
          this.channel._trigger(this.refEvent, { status, response });
      }
      destroy() {
        this._cancelRefEvent();
        this._cancelTimeout();
      }
      _cancelRefEvent() {
        if (!this.refEvent) {
          return;
        }
        this.channel._off(this.refEvent, {});
      }
      _cancelTimeout() {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = void 0;
      }
      _matchReceive({ status, response }) {
        this.recHooks.filter((h2) => h2.status === status).forEach((h2) => h2.callback(response));
      }
      _hasReceived(status) {
        return this.receivedResp && this.receivedResp.status === status;
      }
    };
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js
var REALTIME_PRESENCE_LISTEN_EVENTS, RealtimePresence;
var init_RealtimePresence = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js"() {
    init_functionsRoutes_0_6071133848472854();
    (function(REALTIME_PRESENCE_LISTEN_EVENTS2) {
      REALTIME_PRESENCE_LISTEN_EVENTS2["SYNC"] = "sync";
      REALTIME_PRESENCE_LISTEN_EVENTS2["JOIN"] = "join";
      REALTIME_PRESENCE_LISTEN_EVENTS2["LEAVE"] = "leave";
    })(REALTIME_PRESENCE_LISTEN_EVENTS || (REALTIME_PRESENCE_LISTEN_EVENTS = {}));
    RealtimePresence = class _RealtimePresence {
      static {
        __name(this, "RealtimePresence");
      }
      /**
       * Initializes the Presence.
       *
       * @param channel - The RealtimeChannel
       * @param opts - The options,
       *        for example `{events: {state: 'state', diff: 'diff'}}`
       */
      constructor(channel, opts) {
        this.channel = channel;
        this.state = {};
        this.pendingDiffs = [];
        this.joinRef = null;
        this.enabled = false;
        this.caller = {
          onJoin: /* @__PURE__ */ __name(() => {
          }, "onJoin"),
          onLeave: /* @__PURE__ */ __name(() => {
          }, "onLeave"),
          onSync: /* @__PURE__ */ __name(() => {
          }, "onSync")
        };
        const events = (opts === null || opts === void 0 ? void 0 : opts.events) || {
          state: "presence_state",
          diff: "presence_diff"
        };
        this.channel._on(events.state, {}, (newState) => {
          const { onJoin, onLeave, onSync } = this.caller;
          this.joinRef = this.channel._joinRef();
          this.state = _RealtimePresence.syncState(this.state, newState, onJoin, onLeave);
          this.pendingDiffs.forEach((diff) => {
            this.state = _RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
          });
          this.pendingDiffs = [];
          onSync();
        });
        this.channel._on(events.diff, {}, (diff) => {
          const { onJoin, onLeave, onSync } = this.caller;
          if (this.inPendingSyncState()) {
            this.pendingDiffs.push(diff);
          } else {
            this.state = _RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
            onSync();
          }
        });
        this.onJoin((key, currentPresences, newPresences) => {
          this.channel._trigger("presence", {
            event: "join",
            key,
            currentPresences,
            newPresences
          });
        });
        this.onLeave((key, currentPresences, leftPresences) => {
          this.channel._trigger("presence", {
            event: "leave",
            key,
            currentPresences,
            leftPresences
          });
        });
        this.onSync(() => {
          this.channel._trigger("presence", { event: "sync" });
        });
      }
      /**
       * Used to sync the list of presences on the server with the
       * client's state.
       *
       * An optional `onJoin` and `onLeave` callback can be provided to
       * react to changes in the client's local presences across
       * disconnects and reconnects with the server.
       *
       * @internal
       */
      static syncState(currentState, newState, onJoin, onLeave) {
        const state = this.cloneDeep(currentState);
        const transformedState = this.transformState(newState);
        const joins = {};
        const leaves = {};
        this.map(state, (key, presences) => {
          if (!transformedState[key]) {
            leaves[key] = presences;
          }
        });
        this.map(transformedState, (key, newPresences) => {
          const currentPresences = state[key];
          if (currentPresences) {
            const newPresenceRefs = newPresences.map((m2) => m2.presence_ref);
            const curPresenceRefs = currentPresences.map((m2) => m2.presence_ref);
            const joinedPresences = newPresences.filter((m2) => curPresenceRefs.indexOf(m2.presence_ref) < 0);
            const leftPresences = currentPresences.filter((m2) => newPresenceRefs.indexOf(m2.presence_ref) < 0);
            if (joinedPresences.length > 0) {
              joins[key] = joinedPresences;
            }
            if (leftPresences.length > 0) {
              leaves[key] = leftPresences;
            }
          } else {
            joins[key] = newPresences;
          }
        });
        return this.syncDiff(state, { joins, leaves }, onJoin, onLeave);
      }
      /**
       * Used to sync a diff of presence join and leave events from the
       * server, as they happen.
       *
       * Like `syncState`, `syncDiff` accepts optional `onJoin` and
       * `onLeave` callbacks to react to a user joining or leaving from a
       * device.
       *
       * @internal
       */
      static syncDiff(state, diff, onJoin, onLeave) {
        const { joins, leaves } = {
          joins: this.transformState(diff.joins),
          leaves: this.transformState(diff.leaves)
        };
        if (!onJoin) {
          onJoin = /* @__PURE__ */ __name(() => {
          }, "onJoin");
        }
        if (!onLeave) {
          onLeave = /* @__PURE__ */ __name(() => {
          }, "onLeave");
        }
        this.map(joins, (key, newPresences) => {
          var _a;
          const currentPresences = (_a = state[key]) !== null && _a !== void 0 ? _a : [];
          state[key] = this.cloneDeep(newPresences);
          if (currentPresences.length > 0) {
            const joinedPresenceRefs = state[key].map((m2) => m2.presence_ref);
            const curPresences = currentPresences.filter((m2) => joinedPresenceRefs.indexOf(m2.presence_ref) < 0);
            state[key].unshift(...curPresences);
          }
          onJoin(key, currentPresences, newPresences);
        });
        this.map(leaves, (key, leftPresences) => {
          let currentPresences = state[key];
          if (!currentPresences)
            return;
          const presenceRefsToRemove = leftPresences.map((m2) => m2.presence_ref);
          currentPresences = currentPresences.filter((m2) => presenceRefsToRemove.indexOf(m2.presence_ref) < 0);
          state[key] = currentPresences;
          onLeave(key, currentPresences, leftPresences);
          if (currentPresences.length === 0)
            delete state[key];
        });
        return state;
      }
      /** @internal */
      static map(obj, func) {
        return Object.getOwnPropertyNames(obj).map((key) => func(key, obj[key]));
      }
      /**
       * Remove 'metas' key
       * Change 'phx_ref' to 'presence_ref'
       * Remove 'phx_ref' and 'phx_ref_prev'
       *
       * @example
       * // returns {
       *  abc123: [
       *    { presence_ref: '2', user_id: 1 },
       *    { presence_ref: '3', user_id: 2 }
       *  ]
       * }
       * RealtimePresence.transformState({
       *  abc123: {
       *    metas: [
       *      { phx_ref: '2', phx_ref_prev: '1' user_id: 1 },
       *      { phx_ref: '3', user_id: 2 }
       *    ]
       *  }
       * })
       *
       * @internal
       */
      static transformState(state) {
        state = this.cloneDeep(state);
        return Object.getOwnPropertyNames(state).reduce((newState, key) => {
          const presences = state[key];
          if ("metas" in presences) {
            newState[key] = presences.metas.map((presence) => {
              presence["presence_ref"] = presence["phx_ref"];
              delete presence["phx_ref"];
              delete presence["phx_ref_prev"];
              return presence;
            });
          } else {
            newState[key] = presences;
          }
          return newState;
        }, {});
      }
      /** @internal */
      static cloneDeep(obj) {
        return JSON.parse(JSON.stringify(obj));
      }
      /** @internal */
      onJoin(callback) {
        this.caller.onJoin = callback;
      }
      /** @internal */
      onLeave(callback) {
        this.caller.onLeave = callback;
      }
      /** @internal */
      onSync(callback) {
        this.caller.onSync = callback;
      }
      /** @internal */
      inPendingSyncState() {
        return !this.joinRef || this.joinRef !== this.channel._joinRef();
      }
    };
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js
var REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES, REALTIME_CHANNEL_STATES, RealtimeChannel;
var init_RealtimeChannel = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_constants();
    init_push();
    init_timer();
    init_RealtimePresence();
    init_transformers();
    init_transformers();
    (function(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2) {
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["ALL"] = "*";
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["INSERT"] = "INSERT";
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["UPDATE"] = "UPDATE";
      REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["DELETE"] = "DELETE";
    })(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT || (REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {}));
    (function(REALTIME_LISTEN_TYPES2) {
      REALTIME_LISTEN_TYPES2["BROADCAST"] = "broadcast";
      REALTIME_LISTEN_TYPES2["PRESENCE"] = "presence";
      REALTIME_LISTEN_TYPES2["POSTGRES_CHANGES"] = "postgres_changes";
      REALTIME_LISTEN_TYPES2["SYSTEM"] = "system";
    })(REALTIME_LISTEN_TYPES || (REALTIME_LISTEN_TYPES = {}));
    (function(REALTIME_SUBSCRIBE_STATES2) {
      REALTIME_SUBSCRIBE_STATES2["SUBSCRIBED"] = "SUBSCRIBED";
      REALTIME_SUBSCRIBE_STATES2["TIMED_OUT"] = "TIMED_OUT";
      REALTIME_SUBSCRIBE_STATES2["CLOSED"] = "CLOSED";
      REALTIME_SUBSCRIBE_STATES2["CHANNEL_ERROR"] = "CHANNEL_ERROR";
    })(REALTIME_SUBSCRIBE_STATES || (REALTIME_SUBSCRIBE_STATES = {}));
    REALTIME_CHANNEL_STATES = CHANNEL_STATES;
    RealtimeChannel = class _RealtimeChannel {
      static {
        __name(this, "RealtimeChannel");
      }
      constructor(topic, params = { config: {} }, socket) {
        this.topic = topic;
        this.params = params;
        this.socket = socket;
        this.bindings = {};
        this.state = CHANNEL_STATES.closed;
        this.joinedOnce = false;
        this.pushBuffer = [];
        this.subTopic = topic.replace(/^realtime:/i, "");
        this.params.config = Object.assign({
          broadcast: { ack: false, self: false },
          presence: { key: "", enabled: false },
          private: false
        }, params.config);
        this.timeout = this.socket.timeout;
        this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this.timeout);
        this.rejoinTimer = new Timer(() => this._rejoinUntilConnected(), this.socket.reconnectAfterMs);
        this.joinPush.receive("ok", () => {
          this.state = CHANNEL_STATES.joined;
          this.rejoinTimer.reset();
          this.pushBuffer.forEach((pushEvent) => pushEvent.send());
          this.pushBuffer = [];
        });
        this._onClose(() => {
          this.rejoinTimer.reset();
          this.socket.log("channel", `close ${this.topic} ${this._joinRef()}`);
          this.state = CHANNEL_STATES.closed;
          this.socket._remove(this);
        });
        this._onError((reason) => {
          if (this._isLeaving() || this._isClosed()) {
            return;
          }
          this.socket.log("channel", `error ${this.topic}`, reason);
          this.state = CHANNEL_STATES.errored;
          this.rejoinTimer.scheduleTimeout();
        });
        this.joinPush.receive("timeout", () => {
          if (!this._isJoining()) {
            return;
          }
          this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
          this.state = CHANNEL_STATES.errored;
          this.rejoinTimer.scheduleTimeout();
        });
        this.joinPush.receive("error", (reason) => {
          if (this._isLeaving() || this._isClosed()) {
            return;
          }
          this.socket.log("channel", `error ${this.topic}`, reason);
          this.state = CHANNEL_STATES.errored;
          this.rejoinTimer.scheduleTimeout();
        });
        this._on(CHANNEL_EVENTS.reply, {}, (payload, ref) => {
          this._trigger(this._replyEventName(ref), payload);
        });
        this.presence = new RealtimePresence(this);
        this.broadcastEndpointURL = httpEndpointURL(this.socket.endPoint);
        this.private = this.params.config.private || false;
      }
      /** Subscribe registers your client with the server */
      subscribe(callback, timeout = this.timeout) {
        var _a, _b;
        if (!this.socket.isConnected()) {
          this.socket.connect();
        }
        if (this.state == CHANNEL_STATES.closed) {
          const { config: { broadcast, presence, private: isPrivate } } = this.params;
          const postgres_changes = (_b = (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.map((r2) => r2.filter)) !== null && _b !== void 0 ? _b : [];
          const presence_enabled = !!this.bindings[REALTIME_LISTEN_TYPES.PRESENCE] && this.bindings[REALTIME_LISTEN_TYPES.PRESENCE].length > 0;
          const accessTokenPayload = {};
          const config = {
            broadcast,
            presence: Object.assign(Object.assign({}, presence), { enabled: presence_enabled }),
            postgres_changes,
            private: isPrivate
          };
          if (this.socket.accessTokenValue) {
            accessTokenPayload.access_token = this.socket.accessTokenValue;
          }
          this._onError((e2) => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, e2));
          this._onClose(() => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CLOSED));
          this.updateJoinPayload(Object.assign({ config }, accessTokenPayload));
          this.joinedOnce = true;
          this._rejoin(timeout);
          this.joinPush.receive("ok", async ({ postgres_changes: postgres_changes2 }) => {
            var _a2;
            this.socket.setAuth();
            if (postgres_changes2 === void 0) {
              callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
              return;
            } else {
              const clientPostgresBindings = this.bindings.postgres_changes;
              const bindingsLen = (_a2 = clientPostgresBindings === null || clientPostgresBindings === void 0 ? void 0 : clientPostgresBindings.length) !== null && _a2 !== void 0 ? _a2 : 0;
              const newPostgresBindings = [];
              for (let i2 = 0; i2 < bindingsLen; i2++) {
                const clientPostgresBinding = clientPostgresBindings[i2];
                const { filter: { event, schema, table, filter } } = clientPostgresBinding;
                const serverPostgresFilter = postgres_changes2 && postgres_changes2[i2];
                if (serverPostgresFilter && serverPostgresFilter.event === event && serverPostgresFilter.schema === schema && serverPostgresFilter.table === table && serverPostgresFilter.filter === filter) {
                  newPostgresBindings.push(Object.assign(Object.assign({}, clientPostgresBinding), { id: serverPostgresFilter.id }));
                } else {
                  this.unsubscribe();
                  this.state = CHANNEL_STATES.errored;
                  callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error("mismatch between server and client bindings for postgres changes"));
                  return;
                }
              }
              this.bindings.postgres_changes = newPostgresBindings;
              callback && callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
              return;
            }
          }).receive("error", (error) => {
            this.state = CHANNEL_STATES.errored;
            callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error(JSON.stringify(Object.values(error).join(", ") || "error")));
            return;
          }).receive("timeout", () => {
            callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.TIMED_OUT);
            return;
          });
        }
        return this;
      }
      presenceState() {
        return this.presence.state;
      }
      async track(payload, opts = {}) {
        return await this.send({
          type: "presence",
          event: "track",
          payload
        }, opts.timeout || this.timeout);
      }
      async untrack(opts = {}) {
        return await this.send({
          type: "presence",
          event: "untrack"
        }, opts);
      }
      on(type, filter, callback) {
        if (this.state === CHANNEL_STATES.joined && type === REALTIME_LISTEN_TYPES.PRESENCE) {
          this.socket.log("channel", `resubscribe to ${this.topic} due to change in presence callbacks on joined channel`);
          this.unsubscribe().then(() => this.subscribe());
        }
        return this._on(type, filter, callback);
      }
      /**
       * Sends a message into the channel.
       *
       * @param args Arguments to send to channel
       * @param args.type The type of event to send
       * @param args.event The name of the event being sent
       * @param args.payload Payload to be sent
       * @param opts Options to be used during the send process
       */
      async send(args, opts = {}) {
        var _a, _b;
        if (!this._canPush() && args.type === "broadcast") {
          const { event, payload: endpoint_payload } = args;
          const authorization = this.socket.accessTokenValue ? `Bearer ${this.socket.accessTokenValue}` : "";
          const options = {
            method: "POST",
            headers: {
              Authorization: authorization,
              apikey: this.socket.apiKey ? this.socket.apiKey : "",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messages: [
                {
                  topic: this.subTopic,
                  event,
                  payload: endpoint_payload,
                  private: this.private
                }
              ]
            })
          };
          try {
            const response = await this._fetchWithTimeout(this.broadcastEndpointURL, options, (_a = opts.timeout) !== null && _a !== void 0 ? _a : this.timeout);
            await ((_b = response.body) === null || _b === void 0 ? void 0 : _b.cancel());
            return response.ok ? "ok" : "error";
          } catch (error) {
            if (error.name === "AbortError") {
              return "timed out";
            } else {
              return "error";
            }
          }
        } else {
          return new Promise((resolve) => {
            var _a2, _b2, _c;
            const push = this._push(args.type, args, opts.timeout || this.timeout);
            if (args.type === "broadcast" && !((_c = (_b2 = (_a2 = this.params) === null || _a2 === void 0 ? void 0 : _a2.config) === null || _b2 === void 0 ? void 0 : _b2.broadcast) === null || _c === void 0 ? void 0 : _c.ack)) {
              resolve("ok");
            }
            push.receive("ok", () => resolve("ok"));
            push.receive("error", () => resolve("error"));
            push.receive("timeout", () => resolve("timed out"));
          });
        }
      }
      updateJoinPayload(payload) {
        this.joinPush.updatePayload(payload);
      }
      /**
       * Leaves the channel.
       *
       * Unsubscribes from server events, and instructs channel to terminate on server.
       * Triggers onClose() hooks.
       *
       * To receive leave acknowledgements, use the a `receive` hook to bind to the server ack, ie:
       * channel.unsubscribe().receive("ok", () => alert("left!") )
       */
      unsubscribe(timeout = this.timeout) {
        this.state = CHANNEL_STATES.leaving;
        const onClose = /* @__PURE__ */ __name(() => {
          this.socket.log("channel", `leave ${this.topic}`);
          this._trigger(CHANNEL_EVENTS.close, "leave", this._joinRef());
        }, "onClose");
        this.joinPush.destroy();
        let leavePush = null;
        return new Promise((resolve) => {
          leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
          leavePush.receive("ok", () => {
            onClose();
            resolve("ok");
          }).receive("timeout", () => {
            onClose();
            resolve("timed out");
          }).receive("error", () => {
            resolve("error");
          });
          leavePush.send();
          if (!this._canPush()) {
            leavePush.trigger("ok", {});
          }
        }).finally(() => {
          leavePush === null || leavePush === void 0 ? void 0 : leavePush.destroy();
        });
      }
      /**
       * Teardown the channel.
       *
       * Destroys and stops related timers.
       */
      teardown() {
        this.pushBuffer.forEach((push) => push.destroy());
        this.pushBuffer = [];
        this.rejoinTimer.reset();
        this.joinPush.destroy();
        this.state = CHANNEL_STATES.closed;
        this.bindings = {};
      }
      /** @internal */
      async _fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await this.socket.fetch(url, Object.assign(Object.assign({}, options), { signal: controller.signal }));
        clearTimeout(id);
        return response;
      }
      /** @internal */
      _push(event, payload, timeout = this.timeout) {
        if (!this.joinedOnce) {
          throw `tried to push '${event}' to '${this.topic}' before joining. Use channel.subscribe() before pushing events`;
        }
        let pushEvent = new Push(this, event, payload, timeout);
        if (this._canPush()) {
          pushEvent.send();
        } else {
          this._addToPushBuffer(pushEvent);
        }
        return pushEvent;
      }
      /** @internal */
      _addToPushBuffer(pushEvent) {
        pushEvent.startTimeout();
        this.pushBuffer.push(pushEvent);
        if (this.pushBuffer.length > MAX_PUSH_BUFFER_SIZE) {
          const removedPush = this.pushBuffer.shift();
          if (removedPush) {
            removedPush.destroy();
            this.socket.log("channel", `discarded push due to buffer overflow: ${removedPush.event}`, removedPush.payload);
          }
        }
      }
      /**
       * Overridable message hook
       *
       * Receives all events for specialized message handling before dispatching to the channel callbacks.
       * Must return the payload, modified or unmodified.
       *
       * @internal
       */
      _onMessage(_event, payload, _ref) {
        return payload;
      }
      /** @internal */
      _isMember(topic) {
        return this.topic === topic;
      }
      /** @internal */
      _joinRef() {
        return this.joinPush.ref;
      }
      /** @internal */
      _trigger(type, payload, ref) {
        var _a, _b;
        const typeLower = type.toLocaleLowerCase();
        const { close, error, leave, join } = CHANNEL_EVENTS;
        const events = [close, error, leave, join];
        if (ref && events.indexOf(typeLower) >= 0 && ref !== this._joinRef()) {
          return;
        }
        let handledPayload = this._onMessage(typeLower, payload, ref);
        if (payload && !handledPayload) {
          throw "channel onMessage callbacks must return the payload, modified or unmodified";
        }
        if (["insert", "update", "delete"].includes(typeLower)) {
          (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.filter((bind) => {
            var _a2, _b2, _c;
            return ((_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event) === "*" || ((_c = (_b2 = bind.filter) === null || _b2 === void 0 ? void 0 : _b2.event) === null || _c === void 0 ? void 0 : _c.toLocaleLowerCase()) === typeLower;
          }).map((bind) => bind.callback(handledPayload, ref));
        } else {
          (_b = this.bindings[typeLower]) === null || _b === void 0 ? void 0 : _b.filter((bind) => {
            var _a2, _b2, _c, _d, _e, _f;
            if (["broadcast", "presence", "postgres_changes"].includes(typeLower)) {
              if ("id" in bind) {
                const bindId = bind.id;
                const bindEvent = (_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event;
                return bindId && ((_b2 = payload.ids) === null || _b2 === void 0 ? void 0 : _b2.includes(bindId)) && (bindEvent === "*" || (bindEvent === null || bindEvent === void 0 ? void 0 : bindEvent.toLocaleLowerCase()) === ((_c = payload.data) === null || _c === void 0 ? void 0 : _c.type.toLocaleLowerCase()));
              } else {
                const bindEvent = (_e = (_d = bind === null || bind === void 0 ? void 0 : bind.filter) === null || _d === void 0 ? void 0 : _d.event) === null || _e === void 0 ? void 0 : _e.toLocaleLowerCase();
                return bindEvent === "*" || bindEvent === ((_f = payload === null || payload === void 0 ? void 0 : payload.event) === null || _f === void 0 ? void 0 : _f.toLocaleLowerCase());
              }
            } else {
              return bind.type.toLocaleLowerCase() === typeLower;
            }
          }).map((bind) => {
            if (typeof handledPayload === "object" && "ids" in handledPayload) {
              const postgresChanges = handledPayload.data;
              const { schema, table, commit_timestamp, type: type2, errors } = postgresChanges;
              const enrichedPayload = {
                schema,
                table,
                commit_timestamp,
                eventType: type2,
                new: {},
                old: {},
                errors
              };
              handledPayload = Object.assign(Object.assign({}, enrichedPayload), this._getPayloadRecords(postgresChanges));
            }
            bind.callback(handledPayload, ref);
          });
        }
      }
      /** @internal */
      _isClosed() {
        return this.state === CHANNEL_STATES.closed;
      }
      /** @internal */
      _isJoined() {
        return this.state === CHANNEL_STATES.joined;
      }
      /** @internal */
      _isJoining() {
        return this.state === CHANNEL_STATES.joining;
      }
      /** @internal */
      _isLeaving() {
        return this.state === CHANNEL_STATES.leaving;
      }
      /** @internal */
      _replyEventName(ref) {
        return `chan_reply_${ref}`;
      }
      /** @internal */
      _on(type, filter, callback) {
        const typeLower = type.toLocaleLowerCase();
        const binding = {
          type: typeLower,
          filter,
          callback
        };
        if (this.bindings[typeLower]) {
          this.bindings[typeLower].push(binding);
        } else {
          this.bindings[typeLower] = [binding];
        }
        return this;
      }
      /** @internal */
      _off(type, filter) {
        const typeLower = type.toLocaleLowerCase();
        if (this.bindings[typeLower]) {
          this.bindings[typeLower] = this.bindings[typeLower].filter((bind) => {
            var _a;
            return !(((_a = bind.type) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === typeLower && _RealtimeChannel.isEqual(bind.filter, filter));
          });
        }
        return this;
      }
      /** @internal */
      static isEqual(obj1, obj2) {
        if (Object.keys(obj1).length !== Object.keys(obj2).length) {
          return false;
        }
        for (const k in obj1) {
          if (obj1[k] !== obj2[k]) {
            return false;
          }
        }
        return true;
      }
      /** @internal */
      _rejoinUntilConnected() {
        this.rejoinTimer.scheduleTimeout();
        if (this.socket.isConnected()) {
          this._rejoin();
        }
      }
      /**
       * Registers a callback that will be executed when the channel closes.
       *
       * @internal
       */
      _onClose(callback) {
        this._on(CHANNEL_EVENTS.close, {}, callback);
      }
      /**
       * Registers a callback that will be executed when the channel encounteres an error.
       *
       * @internal
       */
      _onError(callback) {
        this._on(CHANNEL_EVENTS.error, {}, (reason) => callback(reason));
      }
      /**
       * Returns `true` if the socket is connected and the channel has been joined.
       *
       * @internal
       */
      _canPush() {
        return this.socket.isConnected() && this._isJoined();
      }
      /** @internal */
      _rejoin(timeout = this.timeout) {
        if (this._isLeaving()) {
          return;
        }
        this.socket._leaveOpenTopic(this.topic);
        this.state = CHANNEL_STATES.joining;
        this.joinPush.resend(timeout);
      }
      /** @internal */
      _getPayloadRecords(payload) {
        const records = {
          new: {},
          old: {}
        };
        if (payload.type === "INSERT" || payload.type === "UPDATE") {
          records.new = convertChangeData(payload.columns, payload.record);
        }
        if (payload.type === "UPDATE" || payload.type === "DELETE") {
          records.old = convertChangeData(payload.columns, payload.old_record);
        }
        return records;
      }
    };
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js
var noop2, CONNECTION_TIMEOUTS, RECONNECT_INTERVALS, DEFAULT_RECONNECT_FALLBACK, WORKER_SCRIPT, RealtimeClient;
var init_RealtimeClient = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_websocket_factory();
    init_constants();
    init_serializer();
    init_timer();
    init_transformers();
    init_RealtimeChannel();
    noop2 = /* @__PURE__ */ __name(() => {
    }, "noop");
    CONNECTION_TIMEOUTS = {
      HEARTBEAT_INTERVAL: 25e3,
      RECONNECT_DELAY: 10,
      HEARTBEAT_TIMEOUT_FALLBACK: 100
    };
    RECONNECT_INTERVALS = [1e3, 2e3, 5e3, 1e4];
    DEFAULT_RECONNECT_FALLBACK = 1e4;
    WORKER_SCRIPT = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`;
    RealtimeClient = class {
      static {
        __name(this, "RealtimeClient");
      }
      /**
       * Initializes the Socket.
       *
       * @param endPoint The string WebSocket endpoint, ie, "ws://example.com/socket", "wss://example.com", "/socket" (inherited host & protocol)
       * @param httpEndpoint The string HTTP endpoint, ie, "https://example.com", "/" (inherited host & protocol)
       * @param options.transport The Websocket Transport, for example WebSocket. This can be a custom implementation
       * @param options.timeout The default timeout in milliseconds to trigger push timeouts.
       * @param options.params The optional params to pass when connecting.
       * @param options.headers Deprecated: headers cannot be set on websocket connections and this option will be removed in the future.
       * @param options.heartbeatIntervalMs The millisec interval to send a heartbeat message.
       * @param options.logger The optional function for specialized logging, ie: logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
       * @param options.logLevel Sets the log level for Realtime
       * @param options.encode The function to encode outgoing messages. Defaults to JSON: (payload, callback) => callback(JSON.stringify(payload))
       * @param options.decode The function to decode incoming messages. Defaults to Serializer's decode.
       * @param options.reconnectAfterMs he optional function that returns the millsec reconnect interval. Defaults to stepped backoff off.
       * @param options.worker Use Web Worker to set a side flow. Defaults to false.
       * @param options.workerUrl The URL of the worker script. Defaults to https://realtime.supabase.com/worker.js that includes a heartbeat event call to keep the connection alive.
       */
      constructor(endPoint, options) {
        var _a;
        this.accessTokenValue = null;
        this.apiKey = null;
        this.channels = new Array();
        this.endPoint = "";
        this.httpEndpoint = "";
        this.headers = {};
        this.params = {};
        this.timeout = DEFAULT_TIMEOUT;
        this.transport = null;
        this.heartbeatIntervalMs = CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL;
        this.heartbeatTimer = void 0;
        this.pendingHeartbeatRef = null;
        this.heartbeatCallback = noop2;
        this.ref = 0;
        this.reconnectTimer = null;
        this.logger = noop2;
        this.conn = null;
        this.sendBuffer = [];
        this.serializer = new Serializer();
        this.stateChangeCallbacks = {
          open: [],
          close: [],
          error: [],
          message: []
        };
        this.accessToken = null;
        this._connectionState = "disconnected";
        this._wasManualDisconnect = false;
        this._authPromise = null;
        this._resolveFetch = (customFetch) => {
          let _fetch;
          if (customFetch) {
            _fetch = customFetch;
          } else if (typeof fetch === "undefined") {
            _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)).catch((error) => {
              throw new Error(`Failed to load @supabase/node-fetch: ${error.message}. This is required for HTTP requests in Node.js environments without native fetch.`);
            }), "_fetch");
          } else {
            _fetch = fetch;
          }
          return (...args) => _fetch(...args);
        };
        if (!((_a = options === null || options === void 0 ? void 0 : options.params) === null || _a === void 0 ? void 0 : _a.apikey)) {
          throw new Error("API key is required to connect to Realtime");
        }
        this.apiKey = options.params.apikey;
        this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`;
        this.httpEndpoint = httpEndpointURL(endPoint);
        this._initializeOptions(options);
        this._setupReconnectionTimer();
        this.fetch = this._resolveFetch(options === null || options === void 0 ? void 0 : options.fetch);
      }
      /**
       * Connects the socket, unless already connected.
       */
      connect() {
        if (this.isConnecting() || this.isDisconnecting() || this.conn !== null && this.isConnected()) {
          return;
        }
        this._setConnectionState("connecting");
        this._setAuthSafely("connect");
        if (this.transport) {
          this.conn = new this.transport(this.endpointURL());
        } else {
          try {
            this.conn = websocket_factory_default.createWebSocket(this.endpointURL());
          } catch (error) {
            this._setConnectionState("disconnected");
            const errorMessage = error.message;
            if (errorMessage.includes("Node.js")) {
              throw new Error(`${errorMessage}

To use Realtime in Node.js, you need to provide a WebSocket implementation:

Option 1: Use Node.js 22+ which has native WebSocket support
Option 2: Install and provide the "ws" package:

  npm install ws

  import ws from "ws"
  const client = new RealtimeClient(url, {
    ...options,
    transport: ws
  })`);
            }
            throw new Error(`WebSocket not available: ${errorMessage}`);
          }
        }
        this._setupConnectionHandlers();
      }
      /**
       * Returns the URL of the websocket.
       * @returns string The URL of the websocket.
       */
      endpointURL() {
        return this._appendParams(this.endPoint, Object.assign({}, this.params, { vsn: VSN }));
      }
      /**
       * Disconnects the socket.
       *
       * @param code A numeric status code to send on disconnect.
       * @param reason A custom reason for the disconnect.
       */
      disconnect(code, reason) {
        if (this.isDisconnecting()) {
          return;
        }
        this._setConnectionState("disconnecting", true);
        if (this.conn) {
          const fallbackTimer = setTimeout(() => {
            this._setConnectionState("disconnected");
          }, 100);
          this.conn.onclose = () => {
            clearTimeout(fallbackTimer);
            this._setConnectionState("disconnected");
          };
          if (code) {
            this.conn.close(code, reason !== null && reason !== void 0 ? reason : "");
          } else {
            this.conn.close();
          }
          this._teardownConnection();
        } else {
          this._setConnectionState("disconnected");
        }
      }
      /**
       * Returns all created channels
       */
      getChannels() {
        return this.channels;
      }
      /**
       * Unsubscribes and removes a single channel
       * @param channel A RealtimeChannel instance
       */
      async removeChannel(channel) {
        const status = await channel.unsubscribe();
        if (this.channels.length === 0) {
          this.disconnect();
        }
        return status;
      }
      /**
       * Unsubscribes and removes all channels
       */
      async removeAllChannels() {
        const values_1 = await Promise.all(this.channels.map((channel) => channel.unsubscribe()));
        this.channels = [];
        this.disconnect();
        return values_1;
      }
      /**
       * Logs the message.
       *
       * For customized logging, `this.logger` can be overridden.
       */
      log(kind, msg, data) {
        this.logger(kind, msg, data);
      }
      /**
       * Returns the current state of the socket.
       */
      connectionState() {
        switch (this.conn && this.conn.readyState) {
          case SOCKET_STATES.connecting:
            return CONNECTION_STATE.Connecting;
          case SOCKET_STATES.open:
            return CONNECTION_STATE.Open;
          case SOCKET_STATES.closing:
            return CONNECTION_STATE.Closing;
          default:
            return CONNECTION_STATE.Closed;
        }
      }
      /**
       * Returns `true` is the connection is open.
       */
      isConnected() {
        return this.connectionState() === CONNECTION_STATE.Open;
      }
      /**
       * Returns `true` if the connection is currently connecting.
       */
      isConnecting() {
        return this._connectionState === "connecting";
      }
      /**
       * Returns `true` if the connection is currently disconnecting.
       */
      isDisconnecting() {
        return this._connectionState === "disconnecting";
      }
      channel(topic, params = { config: {} }) {
        const realtimeTopic = `realtime:${topic}`;
        const exists = this.getChannels().find((c2) => c2.topic === realtimeTopic);
        if (!exists) {
          const chan = new RealtimeChannel(`realtime:${topic}`, params, this);
          this.channels.push(chan);
          return chan;
        } else {
          return exists;
        }
      }
      /**
       * Push out a message if the socket is connected.
       *
       * If the socket is not connected, the message gets enqueued within a local buffer, and sent out when a connection is next established.
       */
      push(data) {
        const { topic, event, payload, ref } = data;
        const callback = /* @__PURE__ */ __name(() => {
          this.encode(data, (result) => {
            var _a;
            (_a = this.conn) === null || _a === void 0 ? void 0 : _a.send(result);
          });
        }, "callback");
        this.log("push", `${topic} ${event} (${ref})`, payload);
        if (this.isConnected()) {
          callback();
        } else {
          this.sendBuffer.push(callback);
        }
      }
      /**
       * Sets the JWT access token used for channel subscription authorization and Realtime RLS.
       *
       * If param is null it will use the `accessToken` callback function or the token set on the client.
       *
       * On callback used, it will set the value of the token internal to the client.
       *
       * @param token A JWT string to override the token set on the client.
       */
      async setAuth(token = null) {
        this._authPromise = this._performAuth(token);
        try {
          await this._authPromise;
        } finally {
          this._authPromise = null;
        }
      }
      /**
       * Sends a heartbeat message if the socket is connected.
       */
      async sendHeartbeat() {
        var _a;
        if (!this.isConnected()) {
          this.heartbeatCallback("disconnected");
          return;
        }
        if (this.pendingHeartbeatRef) {
          this.pendingHeartbeatRef = null;
          this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
          this.heartbeatCallback("timeout");
          this._wasManualDisconnect = false;
          (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close(WS_CLOSE_NORMAL, "heartbeat timeout");
          setTimeout(() => {
            var _a2;
            if (!this.isConnected()) {
              (_a2 = this.reconnectTimer) === null || _a2 === void 0 ? void 0 : _a2.scheduleTimeout();
            }
          }, CONNECTION_TIMEOUTS.HEARTBEAT_TIMEOUT_FALLBACK);
          return;
        }
        this.pendingHeartbeatRef = this._makeRef();
        this.push({
          topic: "phoenix",
          event: "heartbeat",
          payload: {},
          ref: this.pendingHeartbeatRef
        });
        this.heartbeatCallback("sent");
        this._setAuthSafely("heartbeat");
      }
      onHeartbeat(callback) {
        this.heartbeatCallback = callback;
      }
      /**
       * Flushes send buffer
       */
      flushSendBuffer() {
        if (this.isConnected() && this.sendBuffer.length > 0) {
          this.sendBuffer.forEach((callback) => callback());
          this.sendBuffer = [];
        }
      }
      /**
       * Return the next message ref, accounting for overflows
       *
       * @internal
       */
      _makeRef() {
        let newRef = this.ref + 1;
        if (newRef === this.ref) {
          this.ref = 0;
        } else {
          this.ref = newRef;
        }
        return this.ref.toString();
      }
      /**
       * Unsubscribe from channels with the specified topic.
       *
       * @internal
       */
      _leaveOpenTopic(topic) {
        let dupChannel = this.channels.find((c2) => c2.topic === topic && (c2._isJoined() || c2._isJoining()));
        if (dupChannel) {
          this.log("transport", `leaving duplicate topic "${topic}"`);
          dupChannel.unsubscribe();
        }
      }
      /**
       * Removes a subscription from the socket.
       *
       * @param channel An open subscription.
       *
       * @internal
       */
      _remove(channel) {
        this.channels = this.channels.filter((c2) => c2.topic !== channel.topic);
      }
      /** @internal */
      _onConnMessage(rawMessage) {
        this.decode(rawMessage.data, (msg) => {
          if (msg.topic === "phoenix" && msg.event === "phx_reply") {
            this.heartbeatCallback(msg.payload.status === "ok" ? "ok" : "error");
          }
          if (msg.ref && msg.ref === this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null;
          }
          const { topic, event, payload, ref } = msg;
          const refString = ref ? `(${ref})` : "";
          const status = payload.status || "";
          this.log("receive", `${status} ${topic} ${event} ${refString}`.trim(), payload);
          this.channels.filter((channel) => channel._isMember(topic)).forEach((channel) => channel._trigger(event, payload, ref));
          this._triggerStateCallbacks("message", msg);
        });
      }
      /**
       * Clear specific timer
       * @internal
       */
      _clearTimer(timer) {
        var _a;
        if (timer === "heartbeat" && this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = void 0;
        } else if (timer === "reconnect") {
          (_a = this.reconnectTimer) === null || _a === void 0 ? void 0 : _a.reset();
        }
      }
      /**
       * Clear all timers
       * @internal
       */
      _clearAllTimers() {
        this._clearTimer("heartbeat");
        this._clearTimer("reconnect");
      }
      /**
       * Setup connection handlers for WebSocket events
       * @internal
       */
      _setupConnectionHandlers() {
        if (!this.conn)
          return;
        if ("binaryType" in this.conn) {
          ;
          this.conn.binaryType = "arraybuffer";
        }
        this.conn.onopen = () => this._onConnOpen();
        this.conn.onerror = (error) => this._onConnError(error);
        this.conn.onmessage = (event) => this._onConnMessage(event);
        this.conn.onclose = (event) => this._onConnClose(event);
      }
      /**
       * Teardown connection and cleanup resources
       * @internal
       */
      _teardownConnection() {
        if (this.conn) {
          this.conn.onopen = null;
          this.conn.onerror = null;
          this.conn.onmessage = null;
          this.conn.onclose = null;
          this.conn = null;
        }
        this._clearAllTimers();
        this.channels.forEach((channel) => channel.teardown());
      }
      /** @internal */
      _onConnOpen() {
        this._setConnectionState("connected");
        this.log("transport", `connected to ${this.endpointURL()}`);
        this.flushSendBuffer();
        this._clearTimer("reconnect");
        if (!this.worker) {
          this._startHeartbeat();
        } else {
          if (!this.workerRef) {
            this._startWorkerHeartbeat();
          }
        }
        this._triggerStateCallbacks("open");
      }
      /** @internal */
      _startHeartbeat() {
        this.heartbeatTimer && clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
      }
      /** @internal */
      _startWorkerHeartbeat() {
        if (this.workerUrl) {
          this.log("worker", `starting worker for from ${this.workerUrl}`);
        } else {
          this.log("worker", `starting default worker`);
        }
        const objectUrl = this._workerObjectUrl(this.workerUrl);
        this.workerRef = new Worker(objectUrl);
        this.workerRef.onerror = (error) => {
          this.log("worker", "worker error", error.message);
          this.workerRef.terminate();
        };
        this.workerRef.onmessage = (event) => {
          if (event.data.event === "keepAlive") {
            this.sendHeartbeat();
          }
        };
        this.workerRef.postMessage({
          event: "start",
          interval: this.heartbeatIntervalMs
        });
      }
      /** @internal */
      _onConnClose(event) {
        var _a;
        this._setConnectionState("disconnected");
        this.log("transport", "close", event);
        this._triggerChanError();
        this._clearTimer("heartbeat");
        if (!this._wasManualDisconnect) {
          (_a = this.reconnectTimer) === null || _a === void 0 ? void 0 : _a.scheduleTimeout();
        }
        this._triggerStateCallbacks("close", event);
      }
      /** @internal */
      _onConnError(error) {
        this._setConnectionState("disconnected");
        this.log("transport", `${error}`);
        this._triggerChanError();
        this._triggerStateCallbacks("error", error);
      }
      /** @internal */
      _triggerChanError() {
        this.channels.forEach((channel) => channel._trigger(CHANNEL_EVENTS.error));
      }
      /** @internal */
      _appendParams(url, params) {
        if (Object.keys(params).length === 0) {
          return url;
        }
        const prefix = url.match(/\?/) ? "&" : "?";
        const query = new URLSearchParams(params);
        return `${url}${prefix}${query}`;
      }
      _workerObjectUrl(url) {
        let result_url;
        if (url) {
          result_url = url;
        } else {
          const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
          result_url = URL.createObjectURL(blob);
        }
        return result_url;
      }
      /**
       * Set connection state with proper state management
       * @internal
       */
      _setConnectionState(state, manual = false) {
        this._connectionState = state;
        if (state === "connecting") {
          this._wasManualDisconnect = false;
        } else if (state === "disconnecting") {
          this._wasManualDisconnect = manual;
        }
      }
      /**
       * Perform the actual auth operation
       * @internal
       */
      async _performAuth(token = null) {
        let tokenToSend;
        if (token) {
          tokenToSend = token;
        } else if (this.accessToken) {
          tokenToSend = await this.accessToken();
        } else {
          tokenToSend = this.accessTokenValue;
        }
        if (this.accessTokenValue != tokenToSend) {
          this.accessTokenValue = tokenToSend;
          this.channels.forEach((channel) => {
            const payload = {
              access_token: tokenToSend,
              version: DEFAULT_VERSION
            };
            tokenToSend && channel.updateJoinPayload(payload);
            if (channel.joinedOnce && channel._isJoined()) {
              channel._push(CHANNEL_EVENTS.access_token, {
                access_token: tokenToSend
              });
            }
          });
        }
      }
      /**
       * Wait for any in-flight auth operations to complete
       * @internal
       */
      async _waitForAuthIfNeeded() {
        if (this._authPromise) {
          await this._authPromise;
        }
      }
      /**
       * Safely call setAuth with standardized error handling
       * @internal
       */
      _setAuthSafely(context = "general") {
        this.setAuth().catch((e2) => {
          this.log("error", `error setting auth in ${context}`, e2);
        });
      }
      /**
       * Trigger state change callbacks with proper error handling
       * @internal
       */
      _triggerStateCallbacks(event, data) {
        try {
          this.stateChangeCallbacks[event].forEach((callback) => {
            try {
              callback(data);
            } catch (e2) {
              this.log("error", `error in ${event} callback`, e2);
            }
          });
        } catch (e2) {
          this.log("error", `error triggering ${event} callbacks`, e2);
        }
      }
      /**
       * Setup reconnection timer with proper configuration
       * @internal
       */
      _setupReconnectionTimer() {
        this.reconnectTimer = new Timer(async () => {
          setTimeout(async () => {
            await this._waitForAuthIfNeeded();
            if (!this.isConnected()) {
              this.connect();
            }
          }, CONNECTION_TIMEOUTS.RECONNECT_DELAY);
        }, this.reconnectAfterMs);
      }
      /**
       * Initialize client options with defaults
       * @internal
       */
      _initializeOptions(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.transport = (_a = options === null || options === void 0 ? void 0 : options.transport) !== null && _a !== void 0 ? _a : null;
        this.timeout = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : DEFAULT_TIMEOUT;
        this.heartbeatIntervalMs = (_c = options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs) !== null && _c !== void 0 ? _c : CONNECTION_TIMEOUTS.HEARTBEAT_INTERVAL;
        this.worker = (_d = options === null || options === void 0 ? void 0 : options.worker) !== null && _d !== void 0 ? _d : false;
        this.accessToken = (_e = options === null || options === void 0 ? void 0 : options.accessToken) !== null && _e !== void 0 ? _e : null;
        if (options === null || options === void 0 ? void 0 : options.params)
          this.params = options.params;
        if (options === null || options === void 0 ? void 0 : options.logger)
          this.logger = options.logger;
        if ((options === null || options === void 0 ? void 0 : options.logLevel) || (options === null || options === void 0 ? void 0 : options.log_level)) {
          this.logLevel = options.logLevel || options.log_level;
          this.params = Object.assign(Object.assign({}, this.params), { log_level: this.logLevel });
        }
        this.reconnectAfterMs = (_f = options === null || options === void 0 ? void 0 : options.reconnectAfterMs) !== null && _f !== void 0 ? _f : ((tries) => {
          return RECONNECT_INTERVALS[tries - 1] || DEFAULT_RECONNECT_FALLBACK;
        });
        this.encode = (_g = options === null || options === void 0 ? void 0 : options.encode) !== null && _g !== void 0 ? _g : ((payload, callback) => {
          return callback(JSON.stringify(payload));
        });
        this.decode = (_h = options === null || options === void 0 ? void 0 : options.decode) !== null && _h !== void 0 ? _h : this.serializer.decode.bind(this.serializer);
        if (this.worker) {
          if (typeof window !== "undefined" && !window.Worker) {
            throw new Error("Web Worker is not supported");
          }
          this.workerUrl = options === null || options === void 0 ? void 0 : options.workerUrl;
        }
      }
    };
  }
});

// ../node_modules/@supabase/realtime-js/dist/module/index.js
var init_module2 = __esm({
  "../node_modules/@supabase/realtime-js/dist/module/index.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_RealtimeClient();
    init_RealtimeChannel();
    init_RealtimePresence();
    init_websocket_factory();
  }
});

// ../node_modules/@supabase/storage-js/dist/module/lib/errors.js
function isStorageError(error) {
  return typeof error === "object" && error !== null && "__isStorageError" in error;
}
var StorageError, StorageApiError, StorageUnknownError;
var init_errors = __esm({
  "../node_modules/@supabase/storage-js/dist/module/lib/errors.js"() {
    init_functionsRoutes_0_6071133848472854();
    StorageError = class extends Error {
      static {
        __name(this, "StorageError");
      }
      constructor(message) {
        super(message);
        this.__isStorageError = true;
        this.name = "StorageError";
      }
    };
    __name(isStorageError, "isStorageError");
    StorageApiError = class extends StorageError {
      static {
        __name(this, "StorageApiError");
      }
      constructor(message, status, statusCode) {
        super(message);
        this.name = "StorageApiError";
        this.status = status;
        this.statusCode = statusCode;
      }
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          status: this.status,
          statusCode: this.statusCode
        };
      }
    };
    StorageUnknownError = class extends StorageError {
      static {
        __name(this, "StorageUnknownError");
      }
      constructor(message, originalError) {
        super(message);
        this.name = "StorageUnknownError";
        this.originalError = originalError;
      }
    };
  }
});

// ../node_modules/@supabase/storage-js/dist/module/lib/helpers.js
var __awaiter2, resolveFetch2, resolveResponse, recursiveToCamel, isPlainObject;
var init_helpers = __esm({
  "../node_modules/@supabase/storage-js/dist/module/lib/helpers.js"() {
    init_functionsRoutes_0_6071133848472854();
    __awaiter2 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    resolveFetch2 = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)), "_fetch");
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
    resolveResponse = /* @__PURE__ */ __name(() => __awaiter2(void 0, void 0, void 0, function* () {
      if (typeof Response === "undefined") {
        return (yield Promise.resolve().then(() => (init_browser(), browser_exports))).Response;
      }
      return Response;
    }), "resolveResponse");
    recursiveToCamel = /* @__PURE__ */ __name((item) => {
      if (Array.isArray(item)) {
        return item.map((el) => recursiveToCamel(el));
      } else if (typeof item === "function" || item !== Object(item)) {
        return item;
      }
      const result = {};
      Object.entries(item).forEach(([key, value]) => {
        const newKey = key.replace(/([-_][a-z])/gi, (c2) => c2.toUpperCase().replace(/[-_]/g, ""));
        result[newKey] = recursiveToCamel(value);
      });
      return result;
    }, "recursiveToCamel");
    isPlainObject = /* @__PURE__ */ __name((value) => {
      if (typeof value !== "object" || value === null) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
    }, "isPlainObject");
  }
});

// ../node_modules/@supabase/storage-js/dist/module/lib/fetch.js
function _handleRequest(fetcher, method, url, options, parameters, body2) {
  return __awaiter3(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
      fetcher(url, _getRequestParams(method, options, parameters, body2)).then((result) => {
        if (!result.ok)
          throw result;
        if (options === null || options === void 0 ? void 0 : options.noResolveJson)
          return result;
        return result.json();
      }).then((data) => resolve(data)).catch((error) => handleError(error, reject, options));
    });
  });
}
function get(fetcher, url, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "GET", url, options, parameters);
  });
}
function post(fetcher, url, body2, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "POST", url, options, parameters, body2);
  });
}
function put(fetcher, url, body2, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "PUT", url, options, parameters, body2);
  });
}
function head(fetcher, url, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "HEAD", url, Object.assign(Object.assign({}, options), { noResolveJson: true }), parameters);
  });
}
function remove(fetcher, url, body2, options, parameters) {
  return __awaiter3(this, void 0, void 0, function* () {
    return _handleRequest(fetcher, "DELETE", url, options, parameters, body2);
  });
}
var __awaiter3, _getErrorMessage, handleError, _getRequestParams;
var init_fetch = __esm({
  "../node_modules/@supabase/storage-js/dist/module/lib/fetch.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_errors();
    init_helpers();
    __awaiter3 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    _getErrorMessage = /* @__PURE__ */ __name((err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err), "_getErrorMessage");
    handleError = /* @__PURE__ */ __name((error, reject, options) => __awaiter3(void 0, void 0, void 0, function* () {
      const Res = yield resolveResponse();
      if (error instanceof Res && !(options === null || options === void 0 ? void 0 : options.noResolveJson)) {
        error.json().then((err) => {
          const status = error.status || 500;
          const statusCode = (err === null || err === void 0 ? void 0 : err.statusCode) || status + "";
          reject(new StorageApiError(_getErrorMessage(err), status, statusCode));
        }).catch((err) => {
          reject(new StorageUnknownError(_getErrorMessage(err), err));
        });
      } else {
        reject(new StorageUnknownError(_getErrorMessage(error), error));
      }
    }), "handleError");
    _getRequestParams = /* @__PURE__ */ __name((method, options, parameters, body2) => {
      const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
      if (method === "GET" || !body2) {
        return params;
      }
      if (isPlainObject(body2)) {
        params.headers = Object.assign({ "Content-Type": "application/json" }, options === null || options === void 0 ? void 0 : options.headers);
        params.body = JSON.stringify(body2);
      } else {
        params.body = body2;
      }
      if (options === null || options === void 0 ? void 0 : options.duplex) {
        params.duplex = options.duplex;
      }
      return Object.assign(Object.assign({}, params), parameters);
    }, "_getRequestParams");
    __name(_handleRequest, "_handleRequest");
    __name(get, "get");
    __name(post, "post");
    __name(put, "put");
    __name(head, "head");
    __name(remove, "remove");
  }
});

// ../node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js
var __awaiter4, DEFAULT_SEARCH_OPTIONS, DEFAULT_FILE_OPTIONS, StorageFileApi;
var init_StorageFileApi = __esm({
  "../node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_errors();
    init_fetch();
    init_helpers();
    __awaiter4 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    DEFAULT_SEARCH_OPTIONS = {
      limit: 100,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc"
      }
    };
    DEFAULT_FILE_OPTIONS = {
      cacheControl: "3600",
      contentType: "text/plain;charset=UTF-8",
      upsert: false
    };
    StorageFileApi = class {
      static {
        __name(this, "StorageFileApi");
      }
      constructor(url, headers = {}, bucketId, fetch3) {
        this.url = url;
        this.headers = headers;
        this.bucketId = bucketId;
        this.fetch = resolveFetch2(fetch3);
      }
      /**
       * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
       *
       * @param method HTTP method.
       * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
       * @param fileBody The body of the file to be stored in the bucket.
       */
      uploadOrUpdate(method, path, fileBody, fileOptions) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            let body2;
            const options = Object.assign(Object.assign({}, DEFAULT_FILE_OPTIONS), fileOptions);
            let headers = Object.assign(Object.assign({}, this.headers), method === "POST" && { "x-upsert": String(options.upsert) });
            const metadata = options.metadata;
            if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
              body2 = new FormData();
              body2.append("cacheControl", options.cacheControl);
              if (metadata) {
                body2.append("metadata", this.encodeMetadata(metadata));
              }
              body2.append("", fileBody);
            } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
              body2 = fileBody;
              body2.append("cacheControl", options.cacheControl);
              if (metadata) {
                body2.append("metadata", this.encodeMetadata(metadata));
              }
            } else {
              body2 = fileBody;
              headers["cache-control"] = `max-age=${options.cacheControl}`;
              headers["content-type"] = options.contentType;
              if (metadata) {
                headers["x-metadata"] = this.toBase64(this.encodeMetadata(metadata));
              }
            }
            if (fileOptions === null || fileOptions === void 0 ? void 0 : fileOptions.headers) {
              headers = Object.assign(Object.assign({}, headers), fileOptions.headers);
            }
            const cleanPath = this._removeEmptyFolders(path);
            const _path = this._getFinalPath(cleanPath);
            const data = yield (method == "PUT" ? put : post)(this.fetch, `${this.url}/object/${_path}`, body2, Object.assign({ headers }, (options === null || options === void 0 ? void 0 : options.duplex) ? { duplex: options.duplex } : {}));
            return {
              data: { path: cleanPath, id: data.Id, fullPath: data.Key },
              error: null
            };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Uploads a file to an existing bucket.
       *
       * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
       * @param fileBody The body of the file to be stored in the bucket.
       */
      upload(path, fileBody, fileOptions) {
        return __awaiter4(this, void 0, void 0, function* () {
          return this.uploadOrUpdate("POST", path, fileBody, fileOptions);
        });
      }
      /**
       * Upload a file with a token generated from `createSignedUploadUrl`.
       * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
       * @param token The token generated from `createSignedUploadUrl`
       * @param fileBody The body of the file to be stored in the bucket.
       */
      uploadToSignedUrl(path, token, fileBody, fileOptions) {
        return __awaiter4(this, void 0, void 0, function* () {
          const cleanPath = this._removeEmptyFolders(path);
          const _path = this._getFinalPath(cleanPath);
          const url = new URL(this.url + `/object/upload/sign/${_path}`);
          url.searchParams.set("token", token);
          try {
            let body2;
            const options = Object.assign({ upsert: DEFAULT_FILE_OPTIONS.upsert }, fileOptions);
            const headers = Object.assign(Object.assign({}, this.headers), { "x-upsert": String(options.upsert) });
            if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
              body2 = new FormData();
              body2.append("cacheControl", options.cacheControl);
              body2.append("", fileBody);
            } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
              body2 = fileBody;
              body2.append("cacheControl", options.cacheControl);
            } else {
              body2 = fileBody;
              headers["cache-control"] = `max-age=${options.cacheControl}`;
              headers["content-type"] = options.contentType;
            }
            const data = yield put(this.fetch, url.toString(), body2, { headers });
            return {
              data: { path: cleanPath, fullPath: data.Key },
              error: null
            };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates a signed upload URL.
       * Signed upload URLs can be used to upload files to the bucket without further authentication.
       * They are valid for 2 hours.
       * @param path The file path, including the current file name. For example `folder/image.png`.
       * @param options.upsert If set to true, allows the file to be overwritten if it already exists.
       */
      createSignedUploadUrl(path, options) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            let _path = this._getFinalPath(path);
            const headers = Object.assign({}, this.headers);
            if (options === null || options === void 0 ? void 0 : options.upsert) {
              headers["x-upsert"] = "true";
            }
            const data = yield post(this.fetch, `${this.url}/object/upload/sign/${_path}`, {}, { headers });
            const url = new URL(this.url + data.url);
            const token = url.searchParams.get("token");
            if (!token) {
              throw new StorageError("No token returned by API");
            }
            return { data: { signedUrl: url.toString(), path, token }, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Replaces an existing file at the specified path with a new one.
       *
       * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to update.
       * @param fileBody The body of the file to be stored in the bucket.
       */
      update(path, fileBody, fileOptions) {
        return __awaiter4(this, void 0, void 0, function* () {
          return this.uploadOrUpdate("PUT", path, fileBody, fileOptions);
        });
      }
      /**
       * Moves an existing file to a new path in the same bucket.
       *
       * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
       * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
       * @param options The destination options.
       */
      move(fromPath, toPath, options) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/object/move`, {
              bucketId: this.bucketId,
              sourceKey: fromPath,
              destinationKey: toPath,
              destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
            }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Copies an existing file to a new path in the same bucket.
       *
       * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
       * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
       * @param options The destination options.
       */
      copy(fromPath, toPath, options) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/object/copy`, {
              bucketId: this.bucketId,
              sourceKey: fromPath,
              destinationKey: toPath,
              destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
            }, { headers: this.headers });
            return { data: { path: data.Key }, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates a signed URL. Use a signed URL to share a file for a fixed amount of time.
       *
       * @param path The file path, including the current file name. For example `folder/image.png`.
       * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
       * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
       * @param options.transform Transform the asset before serving it to the client.
       */
      createSignedUrl(path, expiresIn, options) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            let _path = this._getFinalPath(path);
            let data = yield post(this.fetch, `${this.url}/object/sign/${_path}`, Object.assign({ expiresIn }, (options === null || options === void 0 ? void 0 : options.transform) ? { transform: options.transform } : {}), { headers: this.headers });
            const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
            const signedUrl = encodeURI(`${this.url}${data.signedURL}${downloadQueryParam}`);
            data = { signedUrl };
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates multiple signed URLs. Use a signed URL to share a file for a fixed amount of time.
       *
       * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
       * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
       * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
       */
      createSignedUrls(paths, expiresIn, options) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/object/sign/${this.bucketId}`, { expiresIn, paths }, { headers: this.headers });
            const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
            return {
              data: data.map((datum) => Object.assign(Object.assign({}, datum), { signedUrl: datum.signedURL ? encodeURI(`${this.url}${datum.signedURL}${downloadQueryParam}`) : null })),
              error: null
            };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Downloads a file from a private bucket. For public buckets, make a request to the URL returned from `getPublicUrl` instead.
       *
       * @param path The full path and file name of the file to be downloaded. For example `folder/image.png`.
       * @param options.transform Transform the asset before serving it to the client.
       */
      download(path, options) {
        return __awaiter4(this, void 0, void 0, function* () {
          const wantsTransformation = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined";
          const renderPath = wantsTransformation ? "render/image/authenticated" : "object";
          const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
          const queryString = transformationQuery ? `?${transformationQuery}` : "";
          try {
            const _path = this._getFinalPath(path);
            const res = yield get(this.fetch, `${this.url}/${renderPath}/${_path}${queryString}`, {
              headers: this.headers,
              noResolveJson: true
            });
            const data = yield res.blob();
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Retrieves the details of an existing file.
       * @param path
       */
      info(path) {
        return __awaiter4(this, void 0, void 0, function* () {
          const _path = this._getFinalPath(path);
          try {
            const data = yield get(this.fetch, `${this.url}/object/info/${_path}`, {
              headers: this.headers
            });
            return { data: recursiveToCamel(data), error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Checks the existence of a file.
       * @param path
       */
      exists(path) {
        return __awaiter4(this, void 0, void 0, function* () {
          const _path = this._getFinalPath(path);
          try {
            yield head(this.fetch, `${this.url}/object/${_path}`, {
              headers: this.headers
            });
            return { data: true, error: null };
          } catch (error) {
            if (isStorageError(error) && error instanceof StorageUnknownError) {
              const originalError = error.originalError;
              if ([400, 404].includes(originalError === null || originalError === void 0 ? void 0 : originalError.status)) {
                return { data: false, error };
              }
            }
            throw error;
          }
        });
      }
      /**
       * A simple convenience function to get the URL for an asset in a public bucket. If you do not want to use this function, you can construct the public URL by concatenating the bucket URL with the path to the asset.
       * This function does not verify if the bucket is public. If a public URL is created for a bucket which is not public, you will not be able to download the asset.
       *
       * @param path The path and name of the file to generate the public URL for. For example `folder/image.png`.
       * @param options.download Triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
       * @param options.transform Transform the asset before serving it to the client.
       */
      getPublicUrl(path, options) {
        const _path = this._getFinalPath(path);
        const _queryString = [];
        const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `download=${options.download === true ? "" : options.download}` : "";
        if (downloadQueryParam !== "") {
          _queryString.push(downloadQueryParam);
        }
        const wantsTransformation = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined";
        const renderPath = wantsTransformation ? "render/image" : "object";
        const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
        if (transformationQuery !== "") {
          _queryString.push(transformationQuery);
        }
        let queryString = _queryString.join("&");
        if (queryString !== "") {
          queryString = `?${queryString}`;
        }
        return {
          data: { publicUrl: encodeURI(`${this.url}/${renderPath}/public/${_path}${queryString}`) }
        };
      }
      /**
       * Deletes files within the same bucket
       *
       * @param paths An array of files to delete, including the path and file name. For example [`'folder/image.png'`].
       */
      remove(paths) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const data = yield remove(this.fetch, `${this.url}/object/${this.bucketId}`, { prefixes: paths }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Get file metadata
       * @param id the file id to retrieve metadata
       */
      // async getMetadata(
      //   id: string
      // ): Promise<
      //   | {
      //       data: Metadata
      //       error: null
      //     }
      //   | {
      //       data: null
      //       error: StorageError
      //     }
      // > {
      //   try {
      //     const data = await get(this.fetch, `${this.url}/metadata/${id}`, { headers: this.headers })
      //     return { data, error: null }
      //   } catch (error) {
      //     if (isStorageError(error)) {
      //       return { data: null, error }
      //     }
      //     throw error
      //   }
      // }
      /**
       * Update file metadata
       * @param id the file id to update metadata
       * @param meta the new file metadata
       */
      // async updateMetadata(
      //   id: string,
      //   meta: Metadata
      // ): Promise<
      //   | {
      //       data: Metadata
      //       error: null
      //     }
      //   | {
      //       data: null
      //       error: StorageError
      //     }
      // > {
      //   try {
      //     const data = await post(
      //       this.fetch,
      //       `${this.url}/metadata/${id}`,
      //       { ...meta },
      //       { headers: this.headers }
      //     )
      //     return { data, error: null }
      //   } catch (error) {
      //     if (isStorageError(error)) {
      //       return { data: null, error }
      //     }
      //     throw error
      //   }
      // }
      /**
       * Lists all the files within a bucket.
       * @param path The folder path.
       * @param options Search options including limit (defaults to 100), offset, sortBy, and search
       */
      list(path, options, parameters) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const body2 = Object.assign(Object.assign(Object.assign({}, DEFAULT_SEARCH_OPTIONS), options), { prefix: path || "" });
            const data = yield post(this.fetch, `${this.url}/object/list/${this.bucketId}`, body2, { headers: this.headers }, parameters);
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * @experimental this method signature might change in the future
       * @param options search options
       * @param parameters
       */
      listV2(options, parameters) {
        return __awaiter4(this, void 0, void 0, function* () {
          try {
            const body2 = Object.assign({}, options);
            const data = yield post(this.fetch, `${this.url}/object/list-v2/${this.bucketId}`, body2, { headers: this.headers }, parameters);
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      encodeMetadata(metadata) {
        return JSON.stringify(metadata);
      }
      toBase64(data) {
        if (typeof Buffer !== "undefined") {
          return Buffer.from(data).toString("base64");
        }
        return btoa(data);
      }
      _getFinalPath(path) {
        return `${this.bucketId}/${path.replace(/^\/+/, "")}`;
      }
      _removeEmptyFolders(path) {
        return path.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
      }
      transformOptsToQueryString(transform) {
        const params = [];
        if (transform.width) {
          params.push(`width=${transform.width}`);
        }
        if (transform.height) {
          params.push(`height=${transform.height}`);
        }
        if (transform.resize) {
          params.push(`resize=${transform.resize}`);
        }
        if (transform.format) {
          params.push(`format=${transform.format}`);
        }
        if (transform.quality) {
          params.push(`quality=${transform.quality}`);
        }
        return params.join("&");
      }
    };
  }
});

// ../node_modules/@supabase/storage-js/dist/module/lib/version.js
var version2;
var init_version2 = __esm({
  "../node_modules/@supabase/storage-js/dist/module/lib/version.js"() {
    init_functionsRoutes_0_6071133848472854();
    version2 = "2.11.0";
  }
});

// ../node_modules/@supabase/storage-js/dist/module/lib/constants.js
var DEFAULT_HEADERS;
var init_constants2 = __esm({
  "../node_modules/@supabase/storage-js/dist/module/lib/constants.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_version2();
    DEFAULT_HEADERS = { "X-Client-Info": `storage-js/${version2}` };
  }
});

// ../node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js
var __awaiter5, StorageBucketApi;
var init_StorageBucketApi = __esm({
  "../node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_constants2();
    init_errors();
    init_fetch();
    init_helpers();
    __awaiter5 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    StorageBucketApi = class {
      static {
        __name(this, "StorageBucketApi");
      }
      constructor(url, headers = {}, fetch3, opts) {
        const baseUrl = new URL(url);
        if (opts === null || opts === void 0 ? void 0 : opts.useNewHostname) {
          const isSupabaseHost = /supabase\.(co|in|red)$/.test(baseUrl.hostname);
          if (isSupabaseHost && !baseUrl.hostname.includes("storage.supabase.")) {
            baseUrl.hostname = baseUrl.hostname.replace("supabase.", "storage.supabase.");
          }
        }
        this.url = baseUrl.href;
        this.headers = Object.assign(Object.assign({}, DEFAULT_HEADERS), headers);
        this.fetch = resolveFetch2(fetch3);
      }
      /**
       * Retrieves the details of all Storage buckets within an existing project.
       */
      listBuckets() {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const data = yield get(this.fetch, `${this.url}/bucket`, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Retrieves the details of an existing Storage bucket.
       *
       * @param id The unique identifier of the bucket you would like to retrieve.
       */
      getBucket(id) {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const data = yield get(this.fetch, `${this.url}/bucket/${id}`, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Creates a new Storage bucket
       *
       * @param id A unique identifier for the bucket you are creating.
       * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations. By default, buckets are private.
       * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
       * The global file size limit takes precedence over this value.
       * The default value is null, which doesn't set a per bucket file size limit.
       * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
       * The default value is null, which allows files with all mime types to be uploaded.
       * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
       * @returns newly created bucket id
       * @param options.type (private-beta) specifies the bucket type. see `BucketType` for more details.
       *   - default bucket type is `STANDARD`
       */
      createBucket(id, options = {
        public: false
      }) {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/bucket`, {
              id,
              name: id,
              type: options.type,
              public: options.public,
              file_size_limit: options.fileSizeLimit,
              allowed_mime_types: options.allowedMimeTypes
            }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Updates a Storage bucket
       *
       * @param id A unique identifier for the bucket you are updating.
       * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations.
       * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
       * The global file size limit takes precedence over this value.
       * The default value is null, which doesn't set a per bucket file size limit.
       * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
       * The default value is null, which allows files with all mime types to be uploaded.
       * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
       */
      updateBucket(id, options) {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const data = yield put(this.fetch, `${this.url}/bucket/${id}`, {
              id,
              name: id,
              public: options.public,
              file_size_limit: options.fileSizeLimit,
              allowed_mime_types: options.allowedMimeTypes
            }, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Removes all objects inside a single bucket.
       *
       * @param id The unique identifier of the bucket you would like to empty.
       */
      emptyBucket(id) {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const data = yield post(this.fetch, `${this.url}/bucket/${id}/empty`, {}, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * Deletes an existing bucket. A bucket can't be deleted with existing objects inside it.
       * You must first `empty()` the bucket.
       *
       * @param id The unique identifier of the bucket you would like to delete.
       */
      deleteBucket(id) {
        return __awaiter5(this, void 0, void 0, function* () {
          try {
            const data = yield remove(this.fetch, `${this.url}/bucket/${id}`, {}, { headers: this.headers });
            return { data, error: null };
          } catch (error) {
            if (isStorageError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
    };
  }
});

// ../node_modules/@supabase/storage-js/dist/module/StorageClient.js
var StorageClient;
var init_StorageClient = __esm({
  "../node_modules/@supabase/storage-js/dist/module/StorageClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_StorageFileApi();
    init_StorageBucketApi();
    StorageClient = class extends StorageBucketApi {
      static {
        __name(this, "StorageClient");
      }
      constructor(url, headers = {}, fetch3, opts) {
        super(url, headers, fetch3, opts);
      }
      /**
       * Perform file operation in a bucket.
       *
       * @param id The bucket id to operate on.
       */
      from(id) {
        return new StorageFileApi(this.url, this.headers, id, this.fetch);
      }
    };
  }
});

// ../node_modules/@supabase/storage-js/dist/module/lib/types.js
var init_types2 = __esm({
  "../node_modules/@supabase/storage-js/dist/module/lib/types.js"() {
    init_functionsRoutes_0_6071133848472854();
  }
});

// ../node_modules/@supabase/storage-js/dist/module/index.js
var init_module3 = __esm({
  "../node_modules/@supabase/storage-js/dist/module/index.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_StorageClient();
    init_types2();
    init_errors();
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/lib/version.js
var version3;
var init_version3 = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/lib/version.js"() {
    init_functionsRoutes_0_6071133848472854();
    version3 = "2.55.0";
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/lib/constants.js
var JS_ENV, DEFAULT_HEADERS2, DEFAULT_GLOBAL_OPTIONS, DEFAULT_DB_OPTIONS, DEFAULT_AUTH_OPTIONS, DEFAULT_REALTIME_OPTIONS;
var init_constants3 = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/lib/constants.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_version3();
    JS_ENV = "";
    if (typeof Deno !== "undefined") {
      JS_ENV = "deno";
    } else if (typeof document !== "undefined") {
      JS_ENV = "web";
    } else if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
      JS_ENV = "react-native";
    } else {
      JS_ENV = "node";
    }
    DEFAULT_HEADERS2 = { "X-Client-Info": `supabase-js-${JS_ENV}/${version3}` };
    DEFAULT_GLOBAL_OPTIONS = {
      headers: DEFAULT_HEADERS2
    };
    DEFAULT_DB_OPTIONS = {
      schema: "public"
    };
    DEFAULT_AUTH_OPTIONS = {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "implicit"
    };
    DEFAULT_REALTIME_OPTIONS = {};
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/lib/fetch.js
var __awaiter6, resolveFetch3, resolveHeadersConstructor, fetchWithAuth;
var init_fetch2 = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/lib/fetch.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_browser();
    __awaiter6 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    resolveFetch3 = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = browser_default;
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
    resolveHeadersConstructor = /* @__PURE__ */ __name(() => {
      if (typeof Headers === "undefined") {
        return Headers2;
      }
      return Headers;
    }, "resolveHeadersConstructor");
    fetchWithAuth = /* @__PURE__ */ __name((supabaseKey, getAccessToken2, customFetch) => {
      const fetch3 = resolveFetch3(customFetch);
      const HeadersConstructor = resolveHeadersConstructor();
      return (input, init) => __awaiter6(void 0, void 0, void 0, function* () {
        var _a;
        const accessToken = (_a = yield getAccessToken2()) !== null && _a !== void 0 ? _a : supabaseKey;
        let headers = new HeadersConstructor(init === null || init === void 0 ? void 0 : init.headers);
        if (!headers.has("apikey")) {
          headers.set("apikey", supabaseKey);
        }
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${accessToken}`);
        }
        return fetch3(input, Object.assign(Object.assign({}, init), { headers }));
      });
    }, "fetchWithAuth");
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/lib/helpers.js
function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : url + "/";
}
function applySettingDefaults(options, defaults) {
  var _a, _b;
  const { db: dbOptions, auth: authOptions, realtime: realtimeOptions, global: globalOptions } = options;
  const { db: DEFAULT_DB_OPTIONS2, auth: DEFAULT_AUTH_OPTIONS2, realtime: DEFAULT_REALTIME_OPTIONS2, global: DEFAULT_GLOBAL_OPTIONS2 } = defaults;
  const result = {
    db: Object.assign(Object.assign({}, DEFAULT_DB_OPTIONS2), dbOptions),
    auth: Object.assign(Object.assign({}, DEFAULT_AUTH_OPTIONS2), authOptions),
    realtime: Object.assign(Object.assign({}, DEFAULT_REALTIME_OPTIONS2), realtimeOptions),
    storage: {},
    global: Object.assign(Object.assign(Object.assign({}, DEFAULT_GLOBAL_OPTIONS2), globalOptions), { headers: Object.assign(Object.assign({}, (_a = DEFAULT_GLOBAL_OPTIONS2 === null || DEFAULT_GLOBAL_OPTIONS2 === void 0 ? void 0 : DEFAULT_GLOBAL_OPTIONS2.headers) !== null && _a !== void 0 ? _a : {}), (_b = globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.headers) !== null && _b !== void 0 ? _b : {}) }),
    accessToken: /* @__PURE__ */ __name(() => __awaiter7(this, void 0, void 0, function* () {
      return "";
    }), "accessToken")
  };
  if (options.accessToken) {
    result.accessToken = options.accessToken;
  } else {
    delete result.accessToken;
  }
  return result;
}
var __awaiter7;
var init_helpers2 = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/lib/helpers.js"() {
    init_functionsRoutes_0_6071133848472854();
    __awaiter7 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    __name(ensureTrailingSlash, "ensureTrailingSlash");
    __name(applySettingDefaults, "applySettingDefaults");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/version.js
var version4;
var init_version4 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/version.js"() {
    init_functionsRoutes_0_6071133848472854();
    version4 = "2.71.1";
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/constants.js
var AUTO_REFRESH_TICK_DURATION_MS, AUTO_REFRESH_TICK_THRESHOLD, EXPIRY_MARGIN_MS, GOTRUE_URL, STORAGE_KEY, DEFAULT_HEADERS3, API_VERSION_HEADER_NAME, API_VERSIONS, BASE64URL_REGEX, JWKS_TTL;
var init_constants4 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/constants.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_version4();
    AUTO_REFRESH_TICK_DURATION_MS = 30 * 1e3;
    AUTO_REFRESH_TICK_THRESHOLD = 3;
    EXPIRY_MARGIN_MS = AUTO_REFRESH_TICK_THRESHOLD * AUTO_REFRESH_TICK_DURATION_MS;
    GOTRUE_URL = "http://localhost:9999";
    STORAGE_KEY = "supabase.auth.token";
    DEFAULT_HEADERS3 = { "X-Client-Info": `gotrue-js/${version4}` };
    API_VERSION_HEADER_NAME = "X-Supabase-Api-Version";
    API_VERSIONS = {
      "2024-01-01": {
        timestamp: Date.parse("2024-01-01T00:00:00.0Z"),
        name: "2024-01-01"
      }
    };
    BASE64URL_REGEX = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
    JWKS_TTL = 10 * 60 * 1e3;
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/errors.js
function isAuthError(error) {
  return typeof error === "object" && error !== null && "__isAuthError" in error;
}
function isAuthApiError(error) {
  return isAuthError(error) && error.name === "AuthApiError";
}
function isAuthSessionMissingError(error) {
  return isAuthError(error) && error.name === "AuthSessionMissingError";
}
function isAuthImplicitGrantRedirectError(error) {
  return isAuthError(error) && error.name === "AuthImplicitGrantRedirectError";
}
function isAuthRetryableFetchError(error) {
  return isAuthError(error) && error.name === "AuthRetryableFetchError";
}
function isAuthWeakPasswordError(error) {
  return isAuthError(error) && error.name === "AuthWeakPasswordError";
}
var AuthError, AuthApiError, AuthUnknownError, CustomAuthError, AuthSessionMissingError, AuthInvalidTokenResponseError, AuthInvalidCredentialsError, AuthImplicitGrantRedirectError, AuthPKCEGrantCodeExchangeError, AuthRetryableFetchError, AuthWeakPasswordError, AuthInvalidJwtError;
var init_errors2 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/errors.js"() {
    init_functionsRoutes_0_6071133848472854();
    AuthError = class extends Error {
      static {
        __name(this, "AuthError");
      }
      constructor(message, status, code) {
        super(message);
        this.__isAuthError = true;
        this.name = "AuthError";
        this.status = status;
        this.code = code;
      }
    };
    __name(isAuthError, "isAuthError");
    AuthApiError = class extends AuthError {
      static {
        __name(this, "AuthApiError");
      }
      constructor(message, status, code) {
        super(message, status, code);
        this.name = "AuthApiError";
        this.status = status;
        this.code = code;
      }
    };
    __name(isAuthApiError, "isAuthApiError");
    AuthUnknownError = class extends AuthError {
      static {
        __name(this, "AuthUnknownError");
      }
      constructor(message, originalError) {
        super(message);
        this.name = "AuthUnknownError";
        this.originalError = originalError;
      }
    };
    CustomAuthError = class extends AuthError {
      static {
        __name(this, "CustomAuthError");
      }
      constructor(message, name, status, code) {
        super(message, status, code);
        this.name = name;
        this.status = status;
      }
    };
    AuthSessionMissingError = class extends CustomAuthError {
      static {
        __name(this, "AuthSessionMissingError");
      }
      constructor() {
        super("Auth session missing!", "AuthSessionMissingError", 400, void 0);
      }
    };
    __name(isAuthSessionMissingError, "isAuthSessionMissingError");
    AuthInvalidTokenResponseError = class extends CustomAuthError {
      static {
        __name(this, "AuthInvalidTokenResponseError");
      }
      constructor() {
        super("Auth session or user missing", "AuthInvalidTokenResponseError", 500, void 0);
      }
    };
    AuthInvalidCredentialsError = class extends CustomAuthError {
      static {
        __name(this, "AuthInvalidCredentialsError");
      }
      constructor(message) {
        super(message, "AuthInvalidCredentialsError", 400, void 0);
      }
    };
    AuthImplicitGrantRedirectError = class extends CustomAuthError {
      static {
        __name(this, "AuthImplicitGrantRedirectError");
      }
      constructor(message, details = null) {
        super(message, "AuthImplicitGrantRedirectError", 500, void 0);
        this.details = null;
        this.details = details;
      }
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          status: this.status,
          details: this.details
        };
      }
    };
    __name(isAuthImplicitGrantRedirectError, "isAuthImplicitGrantRedirectError");
    AuthPKCEGrantCodeExchangeError = class extends CustomAuthError {
      static {
        __name(this, "AuthPKCEGrantCodeExchangeError");
      }
      constructor(message, details = null) {
        super(message, "AuthPKCEGrantCodeExchangeError", 500, void 0);
        this.details = null;
        this.details = details;
      }
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          status: this.status,
          details: this.details
        };
      }
    };
    AuthRetryableFetchError = class extends CustomAuthError {
      static {
        __name(this, "AuthRetryableFetchError");
      }
      constructor(message, status) {
        super(message, "AuthRetryableFetchError", status, void 0);
      }
    };
    __name(isAuthRetryableFetchError, "isAuthRetryableFetchError");
    AuthWeakPasswordError = class extends CustomAuthError {
      static {
        __name(this, "AuthWeakPasswordError");
      }
      constructor(message, status, reasons) {
        super(message, "AuthWeakPasswordError", status, "weak_password");
        this.reasons = reasons;
      }
    };
    __name(isAuthWeakPasswordError, "isAuthWeakPasswordError");
    AuthInvalidJwtError = class extends CustomAuthError {
      static {
        __name(this, "AuthInvalidJwtError");
      }
      constructor(message) {
        super(message, "AuthInvalidJwtError", 400, "invalid_jwt");
      }
    };
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/base64url.js
function byteToBase64URL(byte, state, emit) {
  if (byte !== null) {
    state.queue = state.queue << 8 | byte;
    state.queuedBits += 8;
    while (state.queuedBits >= 6) {
      const pos = state.queue >> state.queuedBits - 6 & 63;
      emit(TO_BASE64URL[pos]);
      state.queuedBits -= 6;
    }
  } else if (state.queuedBits > 0) {
    state.queue = state.queue << 6 - state.queuedBits;
    state.queuedBits = 6;
    while (state.queuedBits >= 6) {
      const pos = state.queue >> state.queuedBits - 6 & 63;
      emit(TO_BASE64URL[pos]);
      state.queuedBits -= 6;
    }
  }
}
function byteFromBase64URL(charCode, state, emit) {
  const bits = FROM_BASE64URL[charCode];
  if (bits > -1) {
    state.queue = state.queue << 6 | bits;
    state.queuedBits += 6;
    while (state.queuedBits >= 8) {
      emit(state.queue >> state.queuedBits - 8 & 255);
      state.queuedBits -= 8;
    }
  } else if (bits === -2) {
    return;
  } else {
    throw new Error(`Invalid Base64-URL character "${String.fromCharCode(charCode)}"`);
  }
}
function stringFromBase64URL(str) {
  const conv = [];
  const utf8Emit = /* @__PURE__ */ __name((codepoint) => {
    conv.push(String.fromCodePoint(codepoint));
  }, "utf8Emit");
  const utf8State = {
    utf8seq: 0,
    codepoint: 0
  };
  const b64State = { queue: 0, queuedBits: 0 };
  const byteEmit = /* @__PURE__ */ __name((byte) => {
    stringFromUTF8(byte, utf8State, utf8Emit);
  }, "byteEmit");
  for (let i2 = 0; i2 < str.length; i2 += 1) {
    byteFromBase64URL(str.charCodeAt(i2), b64State, byteEmit);
  }
  return conv.join("");
}
function codepointToUTF8(codepoint, emit) {
  if (codepoint <= 127) {
    emit(codepoint);
    return;
  } else if (codepoint <= 2047) {
    emit(192 | codepoint >> 6);
    emit(128 | codepoint & 63);
    return;
  } else if (codepoint <= 65535) {
    emit(224 | codepoint >> 12);
    emit(128 | codepoint >> 6 & 63);
    emit(128 | codepoint & 63);
    return;
  } else if (codepoint <= 1114111) {
    emit(240 | codepoint >> 18);
    emit(128 | codepoint >> 12 & 63);
    emit(128 | codepoint >> 6 & 63);
    emit(128 | codepoint & 63);
    return;
  }
  throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
}
function stringToUTF8(str, emit) {
  for (let i2 = 0; i2 < str.length; i2 += 1) {
    let codepoint = str.charCodeAt(i2);
    if (codepoint > 55295 && codepoint <= 56319) {
      const highSurrogate = (codepoint - 55296) * 1024 & 65535;
      const lowSurrogate = str.charCodeAt(i2 + 1) - 56320 & 65535;
      codepoint = (lowSurrogate | highSurrogate) + 65536;
      i2 += 1;
    }
    codepointToUTF8(codepoint, emit);
  }
}
function stringFromUTF8(byte, state, emit) {
  if (state.utf8seq === 0) {
    if (byte <= 127) {
      emit(byte);
      return;
    }
    for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
      if ((byte >> 7 - leadingBit & 1) === 0) {
        state.utf8seq = leadingBit;
        break;
      }
    }
    if (state.utf8seq === 2) {
      state.codepoint = byte & 31;
    } else if (state.utf8seq === 3) {
      state.codepoint = byte & 15;
    } else if (state.utf8seq === 4) {
      state.codepoint = byte & 7;
    } else {
      throw new Error("Invalid UTF-8 sequence");
    }
    state.utf8seq -= 1;
  } else if (state.utf8seq > 0) {
    if (byte <= 127) {
      throw new Error("Invalid UTF-8 sequence");
    }
    state.codepoint = state.codepoint << 6 | byte & 63;
    state.utf8seq -= 1;
    if (state.utf8seq === 0) {
      emit(state.codepoint);
    }
  }
}
function base64UrlToUint8Array(str) {
  const result = [];
  const state = { queue: 0, queuedBits: 0 };
  const onByte = /* @__PURE__ */ __name((byte) => {
    result.push(byte);
  }, "onByte");
  for (let i2 = 0; i2 < str.length; i2 += 1) {
    byteFromBase64URL(str.charCodeAt(i2), state, onByte);
  }
  return new Uint8Array(result);
}
function stringToUint8Array(str) {
  const result = [];
  stringToUTF8(str, (byte) => result.push(byte));
  return new Uint8Array(result);
}
function bytesToBase64URL(bytes) {
  const result = [];
  const state = { queue: 0, queuedBits: 0 };
  const onChar = /* @__PURE__ */ __name((char) => {
    result.push(char);
  }, "onChar");
  bytes.forEach((byte) => byteToBase64URL(byte, state, onChar));
  byteToBase64URL(null, state, onChar);
  return result.join("");
}
var TO_BASE64URL, IGNORE_BASE64URL, FROM_BASE64URL;
var init_base64url = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/base64url.js"() {
    init_functionsRoutes_0_6071133848472854();
    TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
    IGNORE_BASE64URL = " 	\n\r=".split("");
    FROM_BASE64URL = (() => {
      const charMap = new Array(128);
      for (let i2 = 0; i2 < charMap.length; i2 += 1) {
        charMap[i2] = -1;
      }
      for (let i2 = 0; i2 < IGNORE_BASE64URL.length; i2 += 1) {
        charMap[IGNORE_BASE64URL[i2].charCodeAt(0)] = -2;
      }
      for (let i2 = 0; i2 < TO_BASE64URL.length; i2 += 1) {
        charMap[TO_BASE64URL[i2].charCodeAt(0)] = i2;
      }
      return charMap;
    })();
    __name(byteToBase64URL, "byteToBase64URL");
    __name(byteFromBase64URL, "byteFromBase64URL");
    __name(stringFromBase64URL, "stringFromBase64URL");
    __name(codepointToUTF8, "codepointToUTF8");
    __name(stringToUTF8, "stringToUTF8");
    __name(stringFromUTF8, "stringFromUTF8");
    __name(base64UrlToUint8Array, "base64UrlToUint8Array");
    __name(stringToUint8Array, "stringToUint8Array");
    __name(bytesToBase64URL, "bytesToBase64URL");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/helpers.js
function expiresAt(expiresIn) {
  const timeNow = Math.round(Date.now() / 1e3);
  return timeNow + expiresIn;
}
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c2) {
    const r2 = Math.random() * 16 | 0, v2 = c2 == "x" ? r2 : r2 & 3 | 8;
    return v2.toString(16);
  });
}
function parseParametersFromURL(href) {
  const result = {};
  const url = new URL(href);
  if (url.hash && url.hash[0] === "#") {
    try {
      const hashSearchParams = new URLSearchParams(url.hash.substring(1));
      hashSearchParams.forEach((value, key) => {
        result[key] = value;
      });
    } catch (e2) {
    }
  }
  url.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
function decodeJWT(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthInvalidJwtError("Invalid JWT structure");
  }
  for (let i2 = 0; i2 < parts.length; i2++) {
    if (!BASE64URL_REGEX.test(parts[i2])) {
      throw new AuthInvalidJwtError("JWT not in base64url format");
    }
  }
  const data = {
    // using base64url lib
    header: JSON.parse(stringFromBase64URL(parts[0])),
    payload: JSON.parse(stringFromBase64URL(parts[1])),
    signature: base64UrlToUint8Array(parts[2]),
    raw: {
      header: parts[0],
      payload: parts[1]
    }
  };
  return data;
}
async function sleep(time) {
  return await new Promise((accept) => {
    setTimeout(() => accept(null), time);
  });
}
function retryable(fn, isRetryable) {
  const promise = new Promise((accept, reject) => {
    ;
    (async () => {
      for (let attempt = 0; attempt < Infinity; attempt++) {
        try {
          const result = await fn(attempt);
          if (!isRetryable(attempt, null, result)) {
            accept(result);
            return;
          }
        } catch (e2) {
          if (!isRetryable(attempt, e2)) {
            reject(e2);
            return;
          }
        }
      }
    })();
  });
  return promise;
}
function dec2hex(dec) {
  return ("0" + dec.toString(16)).substr(-2);
}
function generatePKCEVerifier() {
  const verifierLength = 56;
  const array = new Uint32Array(verifierLength);
  if (typeof crypto === "undefined") {
    const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const charSetLen = charSet.length;
    let verifier = "";
    for (let i2 = 0; i2 < verifierLength; i2++) {
      verifier += charSet.charAt(Math.floor(Math.random() * charSetLen));
    }
    return verifier;
  }
  crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join("");
}
async function sha256(randomString) {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(randomString);
  const hash = await crypto.subtle.digest("SHA-256", encodedData);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((c2) => String.fromCharCode(c2)).join("");
}
async function generatePKCEChallenge(verifier) {
  const hasCryptoSupport = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof TextEncoder !== "undefined";
  if (!hasCryptoSupport) {
    console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.");
    return verifier;
  }
  const hashed = await sha256(verifier);
  return btoa(hashed).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function getCodeChallengeAndMethod(storage, storageKey, isPasswordRecovery = false) {
  const codeVerifier = generatePKCEVerifier();
  let storedCodeVerifier = codeVerifier;
  if (isPasswordRecovery) {
    storedCodeVerifier += "/PASSWORD_RECOVERY";
  }
  await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier);
  const codeChallenge = await generatePKCEChallenge(codeVerifier);
  const codeChallengeMethod = codeVerifier === codeChallenge ? "plain" : "s256";
  return [codeChallenge, codeChallengeMethod];
}
function parseResponseAPIVersion(response) {
  const apiVersion = response.headers.get(API_VERSION_HEADER_NAME);
  if (!apiVersion) {
    return null;
  }
  if (!apiVersion.match(API_VERSION_REGEX)) {
    return null;
  }
  try {
    const date = /* @__PURE__ */ new Date(`${apiVersion}T00:00:00.0Z`);
    return date;
  } catch (e2) {
    return null;
  }
}
function validateExp(exp) {
  if (!exp) {
    throw new Error("Missing exp claim");
  }
  const timeNow = Math.floor(Date.now() / 1e3);
  if (exp <= timeNow) {
    throw new Error("JWT has expired");
  }
}
function getAlgorithm(alg) {
  switch (alg) {
    case "RS256":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" }
      };
    case "ES256":
      return {
        name: "ECDSA",
        namedCurve: "P-256",
        hash: { name: "SHA-256" }
      };
    default:
      throw new Error("Invalid alg claim");
  }
}
function validateUUID(str) {
  if (!UUID_REGEX.test(str)) {
    throw new Error("@supabase/auth-js: Expected parameter to be UUID but is not");
  }
}
function userNotAvailableProxy() {
  const proxyTarget = {};
  return new Proxy(proxyTarget, {
    get: /* @__PURE__ */ __name((target, prop) => {
      if (prop === "__isUserNotAvailableProxy") {
        return true;
      }
      if (typeof prop === "symbol") {
        const sProp = prop.toString();
        if (sProp === "Symbol(Symbol.toPrimitive)" || sProp === "Symbol(Symbol.toStringTag)" || sProp === "Symbol(util.inspect.custom)") {
          return void 0;
        }
      }
      throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${prop}" property of the session object is not supported. Please use getUser() instead.`);
    }, "get"),
    set: /* @__PURE__ */ __name((_target, prop) => {
      throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
    }, "set"),
    deleteProperty: /* @__PURE__ */ __name((_target, prop) => {
      throw new Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${prop}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
    }, "deleteProperty")
  });
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
var isBrowser, localStorageWriteTests, supportsLocalStorage, resolveFetch4, looksLikeFetchResponse, setItemAsync, getItemAsync, removeItemAsync, Deferred, API_VERSION_REGEX, UUID_REGEX;
var init_helpers3 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/helpers.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_constants4();
    init_errors2();
    init_base64url();
    __name(expiresAt, "expiresAt");
    __name(uuid, "uuid");
    isBrowser = /* @__PURE__ */ __name(() => typeof window !== "undefined" && typeof document !== "undefined", "isBrowser");
    localStorageWriteTests = {
      tested: false,
      writable: false
    };
    supportsLocalStorage = /* @__PURE__ */ __name(() => {
      if (!isBrowser()) {
        return false;
      }
      try {
        if (typeof globalThis.localStorage !== "object") {
          return false;
        }
      } catch (e2) {
        return false;
      }
      if (localStorageWriteTests.tested) {
        return localStorageWriteTests.writable;
      }
      const randomKey = `lswt-${Math.random()}${Math.random()}`;
      try {
        globalThis.localStorage.setItem(randomKey, randomKey);
        globalThis.localStorage.removeItem(randomKey);
        localStorageWriteTests.tested = true;
        localStorageWriteTests.writable = true;
      } catch (e2) {
        localStorageWriteTests.tested = true;
        localStorageWriteTests.writable = false;
      }
      return localStorageWriteTests.writable;
    }, "supportsLocalStorage");
    __name(parseParametersFromURL, "parseParametersFromURL");
    resolveFetch4 = /* @__PURE__ */ __name((customFetch) => {
      let _fetch;
      if (customFetch) {
        _fetch = customFetch;
      } else if (typeof fetch === "undefined") {
        _fetch = /* @__PURE__ */ __name((...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args)), "_fetch");
      } else {
        _fetch = fetch;
      }
      return (...args) => _fetch(...args);
    }, "resolveFetch");
    looksLikeFetchResponse = /* @__PURE__ */ __name((maybeResponse) => {
      return typeof maybeResponse === "object" && maybeResponse !== null && "status" in maybeResponse && "ok" in maybeResponse && "json" in maybeResponse && typeof maybeResponse.json === "function";
    }, "looksLikeFetchResponse");
    setItemAsync = /* @__PURE__ */ __name(async (storage, key, data) => {
      await storage.setItem(key, JSON.stringify(data));
    }, "setItemAsync");
    getItemAsync = /* @__PURE__ */ __name(async (storage, key) => {
      const value = await storage.getItem(key);
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch (_a) {
        return value;
      }
    }, "getItemAsync");
    removeItemAsync = /* @__PURE__ */ __name(async (storage, key) => {
      await storage.removeItem(key);
    }, "removeItemAsync");
    Deferred = class _Deferred {
      static {
        __name(this, "Deferred");
      }
      constructor() {
        ;
        this.promise = new _Deferred.promiseConstructor((res, rej) => {
          ;
          this.resolve = res;
          this.reject = rej;
        });
      }
    };
    Deferred.promiseConstructor = Promise;
    __name(decodeJWT, "decodeJWT");
    __name(sleep, "sleep");
    __name(retryable, "retryable");
    __name(dec2hex, "dec2hex");
    __name(generatePKCEVerifier, "generatePKCEVerifier");
    __name(sha256, "sha256");
    __name(generatePKCEChallenge, "generatePKCEChallenge");
    __name(getCodeChallengeAndMethod, "getCodeChallengeAndMethod");
    API_VERSION_REGEX = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;
    __name(parseResponseAPIVersion, "parseResponseAPIVersion");
    __name(validateExp, "validateExp");
    __name(getAlgorithm, "getAlgorithm");
    UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    __name(validateUUID, "validateUUID");
    __name(userNotAvailableProxy, "userNotAvailableProxy");
    __name(deepClone, "deepClone");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/fetch.js
async function handleError2(error) {
  var _a;
  if (!looksLikeFetchResponse(error)) {
    throw new AuthRetryableFetchError(_getErrorMessage2(error), 0);
  }
  if (NETWORK_ERROR_CODES.includes(error.status)) {
    throw new AuthRetryableFetchError(_getErrorMessage2(error), error.status);
  }
  let data;
  try {
    data = await error.json();
  } catch (e2) {
    throw new AuthUnknownError(_getErrorMessage2(e2), e2);
  }
  let errorCode = void 0;
  const responseAPIVersion = parseResponseAPIVersion(error);
  if (responseAPIVersion && responseAPIVersion.getTime() >= API_VERSIONS["2024-01-01"].timestamp && typeof data === "object" && data && typeof data.code === "string") {
    errorCode = data.code;
  } else if (typeof data === "object" && data && typeof data.error_code === "string") {
    errorCode = data.error_code;
  }
  if (!errorCode) {
    if (typeof data === "object" && data && typeof data.weak_password === "object" && data.weak_password && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.reasons.reduce((a2, i2) => a2 && typeof i2 === "string", true)) {
      throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, data.weak_password.reasons);
    }
  } else if (errorCode === "weak_password") {
    throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, ((_a = data.weak_password) === null || _a === void 0 ? void 0 : _a.reasons) || []);
  } else if (errorCode === "session_not_found") {
    throw new AuthSessionMissingError();
  }
  throw new AuthApiError(_getErrorMessage2(data), error.status || 500, errorCode);
}
async function _request(fetcher, method, url, options) {
  var _a;
  const headers = Object.assign({}, options === null || options === void 0 ? void 0 : options.headers);
  if (!headers[API_VERSION_HEADER_NAME]) {
    headers[API_VERSION_HEADER_NAME] = API_VERSIONS["2024-01-01"].name;
  }
  if (options === null || options === void 0 ? void 0 : options.jwt) {
    headers["Authorization"] = `Bearer ${options.jwt}`;
  }
  const qs = (_a = options === null || options === void 0 ? void 0 : options.query) !== null && _a !== void 0 ? _a : {};
  if (options === null || options === void 0 ? void 0 : options.redirectTo) {
    qs["redirect_to"] = options.redirectTo;
  }
  const queryString = Object.keys(qs).length ? "?" + new URLSearchParams(qs).toString() : "";
  const data = await _handleRequest2(fetcher, method, url + queryString, {
    headers,
    noResolveJson: options === null || options === void 0 ? void 0 : options.noResolveJson
  }, {}, options === null || options === void 0 ? void 0 : options.body);
  return (options === null || options === void 0 ? void 0 : options.xform) ? options === null || options === void 0 ? void 0 : options.xform(data) : { data: Object.assign({}, data), error: null };
}
async function _handleRequest2(fetcher, method, url, options, parameters, body2) {
  const requestParams = _getRequestParams2(method, options, parameters, body2);
  let result;
  try {
    result = await fetcher(url, Object.assign({}, requestParams));
  } catch (e2) {
    console.error(e2);
    throw new AuthRetryableFetchError(_getErrorMessage2(e2), 0);
  }
  if (!result.ok) {
    await handleError2(result);
  }
  if (options === null || options === void 0 ? void 0 : options.noResolveJson) {
    return result;
  }
  try {
    return await result.json();
  } catch (e2) {
    await handleError2(e2);
  }
}
function _sessionResponse(data) {
  var _a;
  let session = null;
  if (hasSession(data)) {
    session = Object.assign({}, data);
    if (!data.expires_at) {
      session.expires_at = expiresAt(data.expires_in);
    }
  }
  const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
  return { data: { session, user }, error: null };
}
function _sessionResponsePassword(data) {
  const response = _sessionResponse(data);
  if (!response.error && data.weak_password && typeof data.weak_password === "object" && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.message && typeof data.weak_password.message === "string" && data.weak_password.reasons.reduce((a2, i2) => a2 && typeof i2 === "string", true)) {
    response.data.weak_password = data.weak_password;
  }
  return response;
}
function _userResponse(data) {
  var _a;
  const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
  return { data: { user }, error: null };
}
function _ssoResponse(data) {
  return { data, error: null };
}
function _generateLinkResponse(data) {
  const { action_link, email_otp, hashed_token, redirect_to, verification_type } = data, rest = __rest(data, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"]);
  const properties = {
    action_link,
    email_otp,
    hashed_token,
    redirect_to,
    verification_type
  };
  const user = Object.assign({}, rest);
  return {
    data: {
      properties,
      user
    },
    error: null
  };
}
function _noResolveJsonResponse(data) {
  return data;
}
function hasSession(data) {
  return data.access_token && data.refresh_token && data.expires_in;
}
var __rest, _getErrorMessage2, NETWORK_ERROR_CODES, _getRequestParams2;
var init_fetch3 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/fetch.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_constants4();
    init_helpers3();
    init_errors2();
    __rest = function(s2, e2) {
      var t2 = {};
      for (var p2 in s2) if (Object.prototype.hasOwnProperty.call(s2, p2) && e2.indexOf(p2) < 0)
        t2[p2] = s2[p2];
      if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i2 = 0, p2 = Object.getOwnPropertySymbols(s2); i2 < p2.length; i2++) {
          if (e2.indexOf(p2[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s2, p2[i2]))
            t2[p2[i2]] = s2[p2[i2]];
        }
      return t2;
    };
    _getErrorMessage2 = /* @__PURE__ */ __name((err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err), "_getErrorMessage");
    NETWORK_ERROR_CODES = [502, 503, 504];
    __name(handleError2, "handleError");
    _getRequestParams2 = /* @__PURE__ */ __name((method, options, parameters, body2) => {
      const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
      if (method === "GET") {
        return params;
      }
      params.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, options === null || options === void 0 ? void 0 : options.headers);
      params.body = JSON.stringify(body2);
      return Object.assign(Object.assign({}, params), parameters);
    }, "_getRequestParams");
    __name(_request, "_request");
    __name(_handleRequest2, "_handleRequest");
    __name(_sessionResponse, "_sessionResponse");
    __name(_sessionResponsePassword, "_sessionResponsePassword");
    __name(_userResponse, "_userResponse");
    __name(_ssoResponse, "_ssoResponse");
    __name(_generateLinkResponse, "_generateLinkResponse");
    __name(_noResolveJsonResponse, "_noResolveJsonResponse");
    __name(hasSession, "hasSession");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/types.js
var SIGN_OUT_SCOPES;
var init_types3 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/types.js"() {
    init_functionsRoutes_0_6071133848472854();
    SIGN_OUT_SCOPES = ["global", "local", "others"];
  }
});

// ../node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js
var __rest2, GoTrueAdminApi;
var init_GoTrueAdminApi = __esm({
  "../node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_fetch3();
    init_helpers3();
    init_types3();
    init_errors2();
    __rest2 = function(s2, e2) {
      var t2 = {};
      for (var p2 in s2) if (Object.prototype.hasOwnProperty.call(s2, p2) && e2.indexOf(p2) < 0)
        t2[p2] = s2[p2];
      if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i2 = 0, p2 = Object.getOwnPropertySymbols(s2); i2 < p2.length; i2++) {
          if (e2.indexOf(p2[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s2, p2[i2]))
            t2[p2[i2]] = s2[p2[i2]];
        }
      return t2;
    };
    GoTrueAdminApi = class {
      static {
        __name(this, "GoTrueAdminApi");
      }
      constructor({ url = "", headers = {}, fetch: fetch3 }) {
        this.url = url;
        this.headers = headers;
        this.fetch = resolveFetch4(fetch3);
        this.mfa = {
          listFactors: this._listFactors.bind(this),
          deleteFactor: this._deleteFactor.bind(this)
        };
      }
      /**
       * Removes a logged-in session.
       * @param jwt A valid, logged-in JWT.
       * @param scope The logout sope.
       */
      async signOut(jwt, scope = SIGN_OUT_SCOPES[0]) {
        if (SIGN_OUT_SCOPES.indexOf(scope) < 0) {
          throw new Error(`@supabase/auth-js: Parameter scope must be one of ${SIGN_OUT_SCOPES.join(", ")}`);
        }
        try {
          await _request(this.fetch, "POST", `${this.url}/logout?scope=${scope}`, {
            headers: this.headers,
            jwt,
            noResolveJson: true
          });
          return { data: null, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Sends an invite link to an email address.
       * @param email The email address of the user.
       * @param options Additional options to be included when inviting.
       */
      async inviteUserByEmail(email, options = {}) {
        try {
          return await _request(this.fetch, "POST", `${this.url}/invite`, {
            body: { email, data: options.data },
            headers: this.headers,
            redirectTo: options.redirectTo,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Generates email links and OTPs to be sent via a custom email provider.
       * @param email The user's email.
       * @param options.password User password. For signup only.
       * @param options.data Optional user metadata. For signup only.
       * @param options.redirectTo The redirect url which should be appended to the generated link
       */
      async generateLink(params) {
        try {
          const { options } = params, rest = __rest2(params, ["options"]);
          const body2 = Object.assign(Object.assign({}, rest), options);
          if ("newEmail" in rest) {
            body2.new_email = rest === null || rest === void 0 ? void 0 : rest.newEmail;
            delete body2["newEmail"];
          }
          return await _request(this.fetch, "POST", `${this.url}/admin/generate_link`, {
            body: body2,
            headers: this.headers,
            xform: _generateLinkResponse,
            redirectTo: options === null || options === void 0 ? void 0 : options.redirectTo
          });
        } catch (error) {
          if (isAuthError(error)) {
            return {
              data: {
                properties: null,
                user: null
              },
              error
            };
          }
          throw error;
        }
      }
      // User Admin API
      /**
       * Creates a new user.
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async createUser(attributes) {
        try {
          return await _request(this.fetch, "POST", `${this.url}/admin/users`, {
            body: attributes,
            headers: this.headers,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Get a list of users.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       * @param params An object which supports `page` and `perPage` as numbers, to alter the paginated results.
       */
      async listUsers(params) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
          const pagination = { nextPage: null, lastPage: 0, total: 0 };
          const response = await _request(this.fetch, "GET", `${this.url}/admin/users`, {
            headers: this.headers,
            noResolveJson: true,
            query: {
              page: (_b = (_a = params === null || params === void 0 ? void 0 : params.page) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
              per_page: (_d = (_c = params === null || params === void 0 ? void 0 : params.perPage) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""
            },
            xform: _noResolveJsonResponse
          });
          if (response.error)
            throw response.error;
          const users = await response.json();
          const total = (_e = response.headers.get("x-total-count")) !== null && _e !== void 0 ? _e : 0;
          const links = (_g = (_f = response.headers.get("link")) === null || _f === void 0 ? void 0 : _f.split(",")) !== null && _g !== void 0 ? _g : [];
          if (links.length > 0) {
            links.forEach((link) => {
              const page = parseInt(link.split(";")[0].split("=")[1].substring(0, 1));
              const rel = JSON.parse(link.split(";")[1].split("=")[1]);
              pagination[`${rel}Page`] = page;
            });
            pagination.total = parseInt(total);
          }
          return { data: Object.assign(Object.assign({}, users), pagination), error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { users: [] }, error };
          }
          throw error;
        }
      }
      /**
       * Get user by id.
       *
       * @param uid The user's unique identifier
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async getUserById(uid) {
        validateUUID(uid);
        try {
          return await _request(this.fetch, "GET", `${this.url}/admin/users/${uid}`, {
            headers: this.headers,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Updates the user data.
       *
       * @param attributes The data you want to update.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async updateUserById(uid, attributes) {
        validateUUID(uid);
        try {
          return await _request(this.fetch, "PUT", `${this.url}/admin/users/${uid}`, {
            body: attributes,
            headers: this.headers,
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Delete a user. Requires a `service_role` key.
       *
       * @param id The user id you want to remove.
       * @param shouldSoftDelete If true, then the user will be soft-deleted from the auth schema. Soft deletion allows user identification from the hashed user ID but is not reversible.
       * Defaults to false for backward compatibility.
       *
       * This function should only be called on a server. Never expose your `service_role` key in the browser.
       */
      async deleteUser(id, shouldSoftDelete = false) {
        validateUUID(id);
        try {
          return await _request(this.fetch, "DELETE", `${this.url}/admin/users/${id}`, {
            headers: this.headers,
            body: {
              should_soft_delete: shouldSoftDelete
            },
            xform: _userResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      async _listFactors(params) {
        validateUUID(params.userId);
        try {
          const { data, error } = await _request(this.fetch, "GET", `${this.url}/admin/users/${params.userId}/factors`, {
            headers: this.headers,
            xform: /* @__PURE__ */ __name((factors) => {
              return { data: { factors }, error: null };
            }, "xform")
          });
          return { data, error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      async _deleteFactor(params) {
        validateUUID(params.userId);
        validateUUID(params.id);
        try {
          const data = await _request(this.fetch, "DELETE", `${this.url}/admin/users/${params.userId}/factors/${params.id}`, {
            headers: this.headers
          });
          return { data, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
    };
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/local-storage.js
function memoryLocalStorageAdapter(store = {}) {
  return {
    getItem: /* @__PURE__ */ __name((key) => {
      return store[key] || null;
    }, "getItem"),
    setItem: /* @__PURE__ */ __name((key, value) => {
      store[key] = value;
    }, "setItem"),
    removeItem: /* @__PURE__ */ __name((key) => {
      delete store[key];
    }, "removeItem")
  };
}
var init_local_storage = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/local-storage.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(memoryLocalStorageAdapter, "memoryLocalStorageAdapter");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/polyfills.js
function polyfillGlobalThis() {
  if (typeof globalThis === "object")
    return;
  try {
    Object.defineProperty(Object.prototype, "__magic__", {
      get: /* @__PURE__ */ __name(function() {
        return this;
      }, "get"),
      configurable: true
    });
    __magic__.globalThis = __magic__;
    delete Object.prototype.__magic__;
  } catch (e2) {
    if (typeof self !== "undefined") {
      self.globalThis = self;
    }
  }
}
var init_polyfills = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/polyfills.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(polyfillGlobalThis, "polyfillGlobalThis");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/lib/locks.js
async function navigatorLock(name, acquireTimeout, fn) {
  if (internals.debug) {
    console.log("@supabase/gotrue-js: navigatorLock: acquire lock", name, acquireTimeout);
  }
  const abortController = new globalThis.AbortController();
  if (acquireTimeout > 0) {
    setTimeout(() => {
      abortController.abort();
      if (internals.debug) {
        console.log("@supabase/gotrue-js: navigatorLock acquire timed out", name);
      }
    }, acquireTimeout);
  }
  return await Promise.resolve().then(() => globalThis.navigator.locks.request(name, acquireTimeout === 0 ? {
    mode: "exclusive",
    ifAvailable: true
  } : {
    mode: "exclusive",
    signal: abortController.signal
  }, async (lock) => {
    if (lock) {
      if (internals.debug) {
        console.log("@supabase/gotrue-js: navigatorLock: acquired", name, lock.name);
      }
      try {
        return await fn();
      } finally {
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock: released", name, lock.name);
        }
      }
    } else {
      if (acquireTimeout === 0) {
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock: not immediately available", name);
        }
        throw new NavigatorLockAcquireTimeoutError(`Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`);
      } else {
        if (internals.debug) {
          try {
            const result = await globalThis.navigator.locks.query();
            console.log("@supabase/gotrue-js: Navigator LockManager state", JSON.stringify(result, null, "  "));
          } catch (e2) {
            console.warn("@supabase/gotrue-js: Error when querying Navigator LockManager state", e2);
          }
        }
        console.warn("@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request");
        return await fn();
      }
    }
  }));
}
async function processLock(name, acquireTimeout, fn) {
  var _a;
  const previousOperation = (_a = PROCESS_LOCKS[name]) !== null && _a !== void 0 ? _a : Promise.resolve();
  const currentOperation = Promise.race([
    previousOperation.catch(() => {
      return null;
    }),
    acquireTimeout >= 0 ? new Promise((_2, reject) => {
      setTimeout(() => {
        reject(new ProcessLockAcquireTimeoutError(`Acquring process lock with name "${name}" timed out`));
      }, acquireTimeout);
    }) : null
  ].filter((x2) => x2)).catch((e2) => {
    if (e2 && e2.isAcquireTimeout) {
      throw e2;
    }
    return null;
  }).then(async () => {
    return await fn();
  });
  PROCESS_LOCKS[name] = currentOperation.catch(async (e2) => {
    if (e2 && e2.isAcquireTimeout) {
      await previousOperation;
      return null;
    }
    throw e2;
  });
  return await currentOperation;
}
var internals, LockAcquireTimeoutError, NavigatorLockAcquireTimeoutError, ProcessLockAcquireTimeoutError, PROCESS_LOCKS;
var init_locks = __esm({
  "../node_modules/@supabase/auth-js/dist/module/lib/locks.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_helpers3();
    internals = {
      /**
       * @experimental
       */
      debug: !!(globalThis && supportsLocalStorage() && globalThis.localStorage && globalThis.localStorage.getItem("supabase.gotrue-js.locks.debug") === "true")
    };
    LockAcquireTimeoutError = class extends Error {
      static {
        __name(this, "LockAcquireTimeoutError");
      }
      constructor(message) {
        super(message);
        this.isAcquireTimeout = true;
      }
    };
    NavigatorLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
      static {
        __name(this, "NavigatorLockAcquireTimeoutError");
      }
    };
    ProcessLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
      static {
        __name(this, "ProcessLockAcquireTimeoutError");
      }
    };
    __name(navigatorLock, "navigatorLock");
    PROCESS_LOCKS = {};
    __name(processLock, "processLock");
  }
});

// ../node_modules/@supabase/auth-js/dist/module/GoTrueClient.js
async function lockNoOp(name, acquireTimeout, fn) {
  return await fn();
}
var DEFAULT_OPTIONS, GLOBAL_JWKS, GoTrueClient;
var init_GoTrueClient = __esm({
  "../node_modules/@supabase/auth-js/dist/module/GoTrueClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_GoTrueAdminApi();
    init_constants4();
    init_errors2();
    init_fetch3();
    init_helpers3();
    init_local_storage();
    init_polyfills();
    init_version4();
    init_locks();
    init_base64url();
    init_helpers3();
    polyfillGlobalThis();
    DEFAULT_OPTIONS = {
      url: GOTRUE_URL,
      storageKey: STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      headers: DEFAULT_HEADERS3,
      flowType: "implicit",
      debug: false,
      hasCustomAuthorizationHeader: false
    };
    __name(lockNoOp, "lockNoOp");
    GLOBAL_JWKS = {};
    GoTrueClient = class _GoTrueClient {
      static {
        __name(this, "GoTrueClient");
      }
      /**
       * Create a new client for use in the browser.
       */
      constructor(options) {
        var _a, _b;
        this.userStorage = null;
        this.memoryStorage = null;
        this.stateChangeEmitters = /* @__PURE__ */ new Map();
        this.autoRefreshTicker = null;
        this.visibilityChangedCallback = null;
        this.refreshingDeferred = null;
        this.initializePromise = null;
        this.detectSessionInUrl = true;
        this.hasCustomAuthorizationHeader = false;
        this.suppressGetSessionWarning = false;
        this.lockAcquired = false;
        this.pendingInLock = [];
        this.broadcastChannel = null;
        this.logger = console.log;
        this.instanceID = _GoTrueClient.nextInstanceID;
        _GoTrueClient.nextInstanceID += 1;
        if (this.instanceID > 0 && isBrowser()) {
          console.warn("Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.");
        }
        const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        this.logDebugMessages = !!settings.debug;
        if (typeof settings.debug === "function") {
          this.logger = settings.debug;
        }
        this.persistSession = settings.persistSession;
        this.storageKey = settings.storageKey;
        this.autoRefreshToken = settings.autoRefreshToken;
        this.admin = new GoTrueAdminApi({
          url: settings.url,
          headers: settings.headers,
          fetch: settings.fetch
        });
        this.url = settings.url;
        this.headers = settings.headers;
        this.fetch = resolveFetch4(settings.fetch);
        this.lock = settings.lock || lockNoOp;
        this.detectSessionInUrl = settings.detectSessionInUrl;
        this.flowType = settings.flowType;
        this.hasCustomAuthorizationHeader = settings.hasCustomAuthorizationHeader;
        if (settings.lock) {
          this.lock = settings.lock;
        } else if (isBrowser() && ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.navigator) === null || _a === void 0 ? void 0 : _a.locks)) {
          this.lock = navigatorLock;
        } else {
          this.lock = lockNoOp;
        }
        if (!this.jwks) {
          this.jwks = { keys: [] };
          this.jwks_cached_at = Number.MIN_SAFE_INTEGER;
        }
        this.mfa = {
          verify: this._verify.bind(this),
          enroll: this._enroll.bind(this),
          unenroll: this._unenroll.bind(this),
          challenge: this._challenge.bind(this),
          listFactors: this._listFactors.bind(this),
          challengeAndVerify: this._challengeAndVerify.bind(this),
          getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this)
        };
        if (this.persistSession) {
          if (settings.storage) {
            this.storage = settings.storage;
          } else {
            if (supportsLocalStorage()) {
              this.storage = globalThis.localStorage;
            } else {
              this.memoryStorage = {};
              this.storage = memoryLocalStorageAdapter(this.memoryStorage);
            }
          }
          if (settings.userStorage) {
            this.userStorage = settings.userStorage;
          }
        } else {
          this.memoryStorage = {};
          this.storage = memoryLocalStorageAdapter(this.memoryStorage);
        }
        if (isBrowser() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
          try {
            this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
          } catch (e2) {
            console.error("Failed to create a new BroadcastChannel, multi-tab state changes will not be available", e2);
          }
          (_b = this.broadcastChannel) === null || _b === void 0 ? void 0 : _b.addEventListener("message", async (event) => {
            this._debug("received broadcast notification from other tab or client", event);
            await this._notifyAllSubscribers(event.data.event, event.data.session, false);
          });
        }
        this.initialize();
      }
      /**
       * The JWKS used for verifying asymmetric JWTs
       */
      get jwks() {
        var _a, _b;
        return (_b = (_a = GLOBAL_JWKS[this.storageKey]) === null || _a === void 0 ? void 0 : _a.jwks) !== null && _b !== void 0 ? _b : { keys: [] };
      }
      set jwks(value) {
        GLOBAL_JWKS[this.storageKey] = Object.assign(Object.assign({}, GLOBAL_JWKS[this.storageKey]), { jwks: value });
      }
      get jwks_cached_at() {
        var _a, _b;
        return (_b = (_a = GLOBAL_JWKS[this.storageKey]) === null || _a === void 0 ? void 0 : _a.cachedAt) !== null && _b !== void 0 ? _b : Number.MIN_SAFE_INTEGER;
      }
      set jwks_cached_at(value) {
        GLOBAL_JWKS[this.storageKey] = Object.assign(Object.assign({}, GLOBAL_JWKS[this.storageKey]), { cachedAt: value });
      }
      _debug(...args) {
        if (this.logDebugMessages) {
          this.logger(`GoTrueClient@${this.instanceID} (${version4}) ${(/* @__PURE__ */ new Date()).toISOString()}`, ...args);
        }
        return this;
      }
      /**
       * Initializes the client session either from the url or from storage.
       * This method is automatically called when instantiating the client, but should also be called
       * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
       */
      async initialize() {
        if (this.initializePromise) {
          return await this.initializePromise;
        }
        this.initializePromise = (async () => {
          return await this._acquireLock(-1, async () => {
            return await this._initialize();
          });
        })();
        return await this.initializePromise;
      }
      /**
       * IMPORTANT:
       * 1. Never throw in this method, as it is called from the constructor
       * 2. Never return a session from this method as it would be cached over
       *    the whole lifetime of the client
       */
      async _initialize() {
        var _a;
        try {
          const params = parseParametersFromURL(window.location.href);
          let callbackUrlType = "none";
          if (this._isImplicitGrantCallback(params)) {
            callbackUrlType = "implicit";
          } else if (await this._isPKCECallback(params)) {
            callbackUrlType = "pkce";
          }
          if (isBrowser() && this.detectSessionInUrl && callbackUrlType !== "none") {
            const { data, error } = await this._getSessionFromURL(params, callbackUrlType);
            if (error) {
              this._debug("#_initialize()", "error detecting session from URL", error);
              if (isAuthImplicitGrantRedirectError(error)) {
                const errorCode = (_a = error.details) === null || _a === void 0 ? void 0 : _a.code;
                if (errorCode === "identity_already_exists" || errorCode === "identity_not_found" || errorCode === "single_identity_not_deletable") {
                  return { error };
                }
              }
              await this._removeSession();
              return { error };
            }
            const { session, redirectType } = data;
            this._debug("#_initialize()", "detected session in URL", session, "redirect type", redirectType);
            await this._saveSession(session);
            setTimeout(async () => {
              if (redirectType === "recovery") {
                await this._notifyAllSubscribers("PASSWORD_RECOVERY", session);
              } else {
                await this._notifyAllSubscribers("SIGNED_IN", session);
              }
            }, 0);
            return { error: null };
          }
          await this._recoverAndRefresh();
          return { error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { error };
          }
          return {
            error: new AuthUnknownError("Unexpected error during initialization", error)
          };
        } finally {
          await this._handleVisibilityChange();
          this._debug("#_initialize()", "end");
        }
      }
      /**
       * Creates a new anonymous user.
       *
       * @returns A session where the is_anonymous claim in the access token JWT set to true
       */
      async signInAnonymously(credentials) {
        var _a, _b, _c;
        try {
          const res = await _request(this.fetch, "POST", `${this.url}/signup`, {
            headers: this.headers,
            body: {
              data: (_b = (_a = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {},
              gotrue_meta_security: { captcha_token: (_c = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _c === void 0 ? void 0 : _c.captchaToken }
            },
            xform: _sessionResponse
          });
          const { data, error } = res;
          if (error || !data) {
            return { data: { user: null, session: null }, error };
          }
          const session = data.session;
          const user = data.user;
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", session);
          }
          return { data: { user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Creates a new user.
       *
       * Be aware that if a user account exists in the system you may get back an
       * error message that attempts to hide this information from the user.
       * This method has support for PKCE via email signups. The PKCE flow cannot be used when autoconfirm is enabled.
       *
       * @returns A logged-in session if the server has "autoconfirm" ON
       * @returns A user if the server has "autoconfirm" OFF
       */
      async signUp(credentials) {
        var _a, _b, _c;
        try {
          let res;
          if ("email" in credentials) {
            const { email, password, options } = credentials;
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce") {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            res = await _request(this.fetch, "POST", `${this.url}/signup`, {
              headers: this.headers,
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
              body: {
                email,
                password,
                data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod
              },
              xform: _sessionResponse
            });
          } else if ("phone" in credentials) {
            const { phone, password, options } = credentials;
            res = await _request(this.fetch, "POST", `${this.url}/signup`, {
              headers: this.headers,
              body: {
                phone,
                password,
                data: (_b = options === null || options === void 0 ? void 0 : options.data) !== null && _b !== void 0 ? _b : {},
                channel: (_c = options === null || options === void 0 ? void 0 : options.channel) !== null && _c !== void 0 ? _c : "sms",
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponse
            });
          } else {
            throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
          }
          const { data, error } = res;
          if (error || !data) {
            return { data: { user: null, session: null }, error };
          }
          const session = data.session;
          const user = data.user;
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", session);
          }
          return { data: { user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in an existing user with an email and password or phone and password.
       *
       * Be aware that you may get back an error message that will not distinguish
       * between the cases where the account does not exist or that the
       * email/phone and password combination is wrong or that the account can only
       * be accessed via social login.
       */
      async signInWithPassword(credentials) {
        try {
          let res;
          if ("email" in credentials) {
            const { email, password, options } = credentials;
            res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
              headers: this.headers,
              body: {
                email,
                password,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponsePassword
            });
          } else if ("phone" in credentials) {
            const { phone, password, options } = credentials;
            res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
              headers: this.headers,
              body: {
                phone,
                password,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponsePassword
            });
          } else {
            throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
          }
          const { data, error } = res;
          if (error) {
            return { data: { user: null, session: null }, error };
          } else if (!data || !data.session || !data.user) {
            return { data: { user: null, session: null }, error: new AuthInvalidTokenResponseError() };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return {
            data: Object.assign({ user: data.user, session: data.session }, data.weak_password ? { weakPassword: data.weak_password } : null),
            error
          };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in an existing user via a third-party provider.
       * This method supports the PKCE flow.
       */
      async signInWithOAuth(credentials) {
        var _a, _b, _c, _d;
        return await this._handleProviderSignIn(credentials.provider, {
          redirectTo: (_a = credentials.options) === null || _a === void 0 ? void 0 : _a.redirectTo,
          scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
          queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
          skipBrowserRedirect: (_d = credentials.options) === null || _d === void 0 ? void 0 : _d.skipBrowserRedirect
        });
      }
      /**
       * Log in an existing user by exchanging an Auth Code issued during the PKCE flow.
       */
      async exchangeCodeForSession(authCode) {
        await this.initializePromise;
        return this._acquireLock(-1, async () => {
          return this._exchangeCodeForSession(authCode);
        });
      }
      /**
       * Signs in a user by verifying a message signed by the user's private key.
       * Only Solana supported at this time, using the Sign in with Solana standard.
       */
      async signInWithWeb3(credentials) {
        const { chain } = credentials;
        if (chain === "solana") {
          return await this.signInWithSolana(credentials);
        }
        throw new Error(`@supabase/auth-js: Unsupported chain "${chain}"`);
      }
      async signInWithSolana(credentials) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        let message;
        let signature;
        if ("message" in credentials) {
          message = credentials.message;
          signature = credentials.signature;
        } else {
          const { chain, wallet, statement, options } = credentials;
          let resolvedWallet;
          if (!isBrowser()) {
            if (typeof wallet !== "object" || !(options === null || options === void 0 ? void 0 : options.url)) {
              throw new Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
            }
            resolvedWallet = wallet;
          } else if (typeof wallet === "object") {
            resolvedWallet = wallet;
          } else {
            const windowAny = window;
            if ("solana" in windowAny && typeof windowAny.solana === "object" && ("signIn" in windowAny.solana && typeof windowAny.solana.signIn === "function" || "signMessage" in windowAny.solana && typeof windowAny.solana.signMessage === "function")) {
              resolvedWallet = windowAny.solana;
            } else {
              throw new Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`);
            }
          }
          const url = new URL((_a = options === null || options === void 0 ? void 0 : options.url) !== null && _a !== void 0 ? _a : window.location.href);
          if ("signIn" in resolvedWallet && resolvedWallet.signIn) {
            const output = await resolvedWallet.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, options === null || options === void 0 ? void 0 : options.signInWithSolana), {
              // non-overridable properties
              version: "1",
              domain: url.host,
              uri: url.href
            }), statement ? { statement } : null));
            let outputToProcess;
            if (Array.isArray(output) && output[0] && typeof output[0] === "object") {
              outputToProcess = output[0];
            } else if (output && typeof output === "object" && "signedMessage" in output && "signature" in output) {
              outputToProcess = output;
            } else {
              throw new Error("@supabase/auth-js: Wallet method signIn() returned unrecognized value");
            }
            if ("signedMessage" in outputToProcess && "signature" in outputToProcess && (typeof outputToProcess.signedMessage === "string" || outputToProcess.signedMessage instanceof Uint8Array) && outputToProcess.signature instanceof Uint8Array) {
              message = typeof outputToProcess.signedMessage === "string" ? outputToProcess.signedMessage : new TextDecoder().decode(outputToProcess.signedMessage);
              signature = outputToProcess.signature;
            } else {
              throw new Error("@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields");
            }
          } else {
            if (!("signMessage" in resolvedWallet) || typeof resolvedWallet.signMessage !== "function" || !("publicKey" in resolvedWallet) || typeof resolvedWallet !== "object" || !resolvedWallet.publicKey || !("toBase58" in resolvedWallet.publicKey) || typeof resolvedWallet.publicKey.toBase58 !== "function") {
              throw new Error("@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API");
            }
            message = [
              `${url.host} wants you to sign in with your Solana account:`,
              resolvedWallet.publicKey.toBase58(),
              ...statement ? ["", statement, ""] : [""],
              "Version: 1",
              `URI: ${url.href}`,
              `Issued At: ${(_c = (_b = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _b === void 0 ? void 0 : _b.issuedAt) !== null && _c !== void 0 ? _c : (/* @__PURE__ */ new Date()).toISOString()}`,
              ...((_d = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _d === void 0 ? void 0 : _d.notBefore) ? [`Not Before: ${options.signInWithSolana.notBefore}`] : [],
              ...((_e = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _e === void 0 ? void 0 : _e.expirationTime) ? [`Expiration Time: ${options.signInWithSolana.expirationTime}`] : [],
              ...((_f = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _f === void 0 ? void 0 : _f.chainId) ? [`Chain ID: ${options.signInWithSolana.chainId}`] : [],
              ...((_g = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _g === void 0 ? void 0 : _g.nonce) ? [`Nonce: ${options.signInWithSolana.nonce}`] : [],
              ...((_h = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _h === void 0 ? void 0 : _h.requestId) ? [`Request ID: ${options.signInWithSolana.requestId}`] : [],
              ...((_k = (_j = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _j === void 0 ? void 0 : _j.resources) === null || _k === void 0 ? void 0 : _k.length) ? [
                "Resources",
                ...options.signInWithSolana.resources.map((resource) => `- ${resource}`)
              ] : []
            ].join("\n");
            const maybeSignature = await resolvedWallet.signMessage(new TextEncoder().encode(message), "utf8");
            if (!maybeSignature || !(maybeSignature instanceof Uint8Array)) {
              throw new Error("@supabase/auth-js: Wallet signMessage() API returned an recognized value");
            }
            signature = maybeSignature;
          }
        }
        try {
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=web3`, {
            headers: this.headers,
            body: Object.assign({ chain: "solana", message, signature: bytesToBase64URL(signature) }, ((_l = credentials.options) === null || _l === void 0 ? void 0 : _l.captchaToken) ? { gotrue_meta_security: { captcha_token: (_m = credentials.options) === null || _m === void 0 ? void 0 : _m.captchaToken } } : null),
            xform: _sessionResponse
          });
          if (error) {
            throw error;
          }
          if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data: Object.assign({}, data), error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      async _exchangeCodeForSession(authCode) {
        const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        const [codeVerifier, redirectType] = (storageItem !== null && storageItem !== void 0 ? storageItem : "").split("/");
        try {
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=pkce`, {
            headers: this.headers,
            body: {
              auth_code: authCode,
              code_verifier: codeVerifier
            },
            xform: _sessionResponse
          });
          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          if (error) {
            throw error;
          }
          if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null, redirectType: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data: Object.assign(Object.assign({}, data), { redirectType: redirectType !== null && redirectType !== void 0 ? redirectType : null }), error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null, redirectType: null }, error };
          }
          throw error;
        }
      }
      /**
       * Allows signing in with an OIDC ID token. The authentication provider used
       * should be enabled and configured.
       */
      async signInWithIdToken(credentials) {
        try {
          const { options, provider, token, access_token, nonce } = credentials;
          const res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, {
            headers: this.headers,
            body: {
              provider,
              id_token: token,
              access_token,
              nonce,
              gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
            },
            xform: _sessionResponse
          });
          const { data, error } = res;
          if (error) {
            return { data: { user: null, session: null }, error };
          } else if (!data || !data.session || !data.user) {
            return {
              data: { user: null, session: null },
              error: new AuthInvalidTokenResponseError()
            };
          }
          if (data.session) {
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("SIGNED_IN", data.session);
          }
          return { data, error };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in a user using magiclink or a one-time password (OTP).
       *
       * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
       * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
       * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
       *
       * Be aware that you may get back an error message that will not distinguish
       * between the cases where the account does not exist or, that the account
       * can only be accessed via social login.
       *
       * Do note that you will need to configure a Whatsapp sender on Twilio
       * if you are using phone sign in with the 'whatsapp' channel. The whatsapp
       * channel is not supported on other providers
       * at this time.
       * This method supports PKCE when an email is passed.
       */
      async signInWithOtp(credentials) {
        var _a, _b, _c, _d, _e;
        try {
          if ("email" in credentials) {
            const { email, options } = credentials;
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce") {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            const { error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
              headers: this.headers,
              body: {
                email,
                data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                create_user: (_b = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _b !== void 0 ? _b : true,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod
              },
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
            });
            return { data: { user: null, session: null }, error };
          }
          if ("phone" in credentials) {
            const { phone, options } = credentials;
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
              headers: this.headers,
              body: {
                phone,
                data: (_c = options === null || options === void 0 ? void 0 : options.data) !== null && _c !== void 0 ? _c : {},
                create_user: (_d = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _d !== void 0 ? _d : true,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                channel: (_e = options === null || options === void 0 ? void 0 : options.channel) !== null && _e !== void 0 ? _e : "sms"
              }
            });
            return { data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id }, error };
          }
          throw new AuthInvalidCredentialsError("You must provide either an email or phone number.");
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
       */
      async verifyOtp(params) {
        var _a, _b;
        try {
          let redirectTo = void 0;
          let captchaToken = void 0;
          if ("options" in params) {
            redirectTo = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo;
            captchaToken = (_b = params.options) === null || _b === void 0 ? void 0 : _b.captchaToken;
          }
          const { data, error } = await _request(this.fetch, "POST", `${this.url}/verify`, {
            headers: this.headers,
            body: Object.assign(Object.assign({}, params), { gotrue_meta_security: { captcha_token: captchaToken } }),
            redirectTo,
            xform: _sessionResponse
          });
          if (error) {
            throw error;
          }
          if (!data) {
            throw new Error("An error occurred on token verification.");
          }
          const session = data.session;
          const user = data.user;
          if (session === null || session === void 0 ? void 0 : session.access_token) {
            await this._saveSession(session);
            await this._notifyAllSubscribers(params.type == "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN", session);
          }
          return { data: { user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Attempts a single-sign on using an enterprise Identity Provider. A
       * successful SSO attempt will redirect the current page to the identity
       * provider authorization page. The redirect URL is implementation and SSO
       * protocol specific.
       *
       * You can use it by providing a SSO domain. Typically you can extract this
       * domain by asking users for their email address. If this domain is
       * registered on the Auth instance the redirect will use that organization's
       * currently active SSO Identity Provider for the login.
       *
       * If you have built an organization-specific login page, you can use the
       * organization's SSO Identity Provider UUID directly instead.
       */
      async signInWithSSO(params) {
        var _a, _b, _c;
        try {
          let codeChallenge = null;
          let codeChallengeMethod = null;
          if (this.flowType === "pkce") {
            ;
            [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          }
          return await _request(this.fetch, "POST", `${this.url}/sso`, {
            body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in params ? { provider_id: params.providerId } : null), "domain" in params ? { domain: params.domain } : null), { redirect_to: (_b = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo) !== null && _b !== void 0 ? _b : void 0 }), ((_c = params === null || params === void 0 ? void 0 : params.options) === null || _c === void 0 ? void 0 : _c.captchaToken) ? { gotrue_meta_security: { captcha_token: params.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
            headers: this.headers,
            xform: _ssoResponse
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Sends a reauthentication OTP to the user's email or phone number.
       * Requires the user to be signed-in.
       */
      async reauthenticate() {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._reauthenticate();
        });
      }
      async _reauthenticate() {
        try {
          return await this._useSession(async (result) => {
            const { data: { session }, error: sessionError } = result;
            if (sessionError)
              throw sessionError;
            if (!session)
              throw new AuthSessionMissingError();
            const { error } = await _request(this.fetch, "GET", `${this.url}/reauthenticate`, {
              headers: this.headers,
              jwt: session.access_token
            });
            return { data: { user: null, session: null }, error };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Resends an existing signup confirmation email, email change email, SMS OTP or phone change OTP.
       */
      async resend(credentials) {
        try {
          const endpoint = `${this.url}/resend`;
          if ("email" in credentials) {
            const { email, type, options } = credentials;
            const { error } = await _request(this.fetch, "POST", endpoint, {
              headers: this.headers,
              body: {
                email,
                type,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
            });
            return { data: { user: null, session: null }, error };
          } else if ("phone" in credentials) {
            const { phone, type, options } = credentials;
            const { data, error } = await _request(this.fetch, "POST", endpoint, {
              headers: this.headers,
              body: {
                phone,
                type,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              }
            });
            return { data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id }, error };
          }
          throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a type");
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Returns the session, refreshing it if necessary.
       *
       * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
       *
       * **IMPORTANT:** This method loads values directly from the storage attached
       * to the client. If that storage is based on request cookies for example,
       * the values in it may not be authentic and therefore it's strongly advised
       * against using this method and its results in such circumstances. A warning
       * will be emitted if this is detected. Use {@link #getUser()} instead.
       */
      async getSession() {
        await this.initializePromise;
        const result = await this._acquireLock(-1, async () => {
          return this._useSession(async (result2) => {
            return result2;
          });
        });
        return result;
      }
      /**
       * Acquires a global lock based on the storage key.
       */
      async _acquireLock(acquireTimeout, fn) {
        this._debug("#_acquireLock", "begin", acquireTimeout);
        try {
          if (this.lockAcquired) {
            const last = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve();
            const result = (async () => {
              await last;
              return await fn();
            })();
            this.pendingInLock.push((async () => {
              try {
                await result;
              } catch (e2) {
              }
            })());
            return result;
          }
          return await this.lock(`lock:${this.storageKey}`, acquireTimeout, async () => {
            this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
            try {
              this.lockAcquired = true;
              const result = fn();
              this.pendingInLock.push((async () => {
                try {
                  await result;
                } catch (e2) {
                }
              })());
              await result;
              while (this.pendingInLock.length) {
                const waitOn = [...this.pendingInLock];
                await Promise.all(waitOn);
                this.pendingInLock.splice(0, waitOn.length);
              }
              return await result;
            } finally {
              this._debug("#_acquireLock", "lock released for storage key", this.storageKey);
              this.lockAcquired = false;
            }
          });
        } finally {
          this._debug("#_acquireLock", "end");
        }
      }
      /**
       * Use instead of {@link #getSession} inside the library. It is
       * semantically usually what you want, as getting a session involves some
       * processing afterwards that requires only one client operating on the
       * session at once across multiple tabs or processes.
       */
      async _useSession(fn) {
        this._debug("#_useSession", "begin");
        try {
          const result = await this.__loadSession();
          return await fn(result);
        } finally {
          this._debug("#_useSession", "end");
        }
      }
      /**
       * NEVER USE DIRECTLY!
       *
       * Always use {@link #_useSession}.
       */
      async __loadSession() {
        this._debug("#__loadSession()", "begin");
        if (!this.lockAcquired) {
          this._debug("#__loadSession()", "used outside of an acquired lock!", new Error().stack);
        }
        try {
          let currentSession = null;
          const maybeSession = await getItemAsync(this.storage, this.storageKey);
          this._debug("#getSession()", "session from storage", maybeSession);
          if (maybeSession !== null) {
            if (this._isValidSession(maybeSession)) {
              currentSession = maybeSession;
            } else {
              this._debug("#getSession()", "session from storage is not valid");
              await this._removeSession();
            }
          }
          if (!currentSession) {
            return { data: { session: null }, error: null };
          }
          const hasExpired = currentSession.expires_at ? currentSession.expires_at * 1e3 - Date.now() < EXPIRY_MARGIN_MS : false;
          this._debug("#__loadSession()", `session has${hasExpired ? "" : " not"} expired`, "expires_at", currentSession.expires_at);
          if (!hasExpired) {
            if (this.userStorage) {
              const maybeUser = await getItemAsync(this.userStorage, this.storageKey + "-user");
              if (maybeUser === null || maybeUser === void 0 ? void 0 : maybeUser.user) {
                currentSession.user = maybeUser.user;
              } else {
                currentSession.user = userNotAvailableProxy();
              }
            }
            if (this.storage.isServer && currentSession.user) {
              let suppressWarning = this.suppressGetSessionWarning;
              const proxySession = new Proxy(currentSession, {
                get: /* @__PURE__ */ __name((target, prop, receiver) => {
                  if (!suppressWarning && prop === "user") {
                    console.warn("Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.");
                    suppressWarning = true;
                    this.suppressGetSessionWarning = true;
                  }
                  return Reflect.get(target, prop, receiver);
                }, "get")
              });
              currentSession = proxySession;
            }
            return { data: { session: currentSession }, error: null };
          }
          const { session, error } = await this._callRefreshToken(currentSession.refresh_token);
          if (error) {
            return { data: { session: null }, error };
          }
          return { data: { session }, error: null };
        } finally {
          this._debug("#__loadSession()", "end");
        }
      }
      /**
       * Gets the current user details if there is an existing session. This method
       * performs a network request to the Supabase Auth server, so the returned
       * value is authentic and can be used to base authorization rules on.
       *
       * @param jwt Takes in an optional access token JWT. If no JWT is provided, the JWT from the current session is used.
       */
      async getUser(jwt) {
        if (jwt) {
          return await this._getUser(jwt);
        }
        await this.initializePromise;
        const result = await this._acquireLock(-1, async () => {
          return await this._getUser();
        });
        return result;
      }
      async _getUser(jwt) {
        try {
          if (jwt) {
            return await _request(this.fetch, "GET", `${this.url}/user`, {
              headers: this.headers,
              jwt,
              xform: _userResponse
            });
          }
          return await this._useSession(async (result) => {
            var _a, _b, _c;
            const { data, error } = result;
            if (error) {
              throw error;
            }
            if (!((_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) && !this.hasCustomAuthorizationHeader) {
              return { data: { user: null }, error: new AuthSessionMissingError() };
            }
            return await _request(this.fetch, "GET", `${this.url}/user`, {
              headers: this.headers,
              jwt: (_c = (_b = data.session) === null || _b === void 0 ? void 0 : _b.access_token) !== null && _c !== void 0 ? _c : void 0,
              xform: _userResponse
            });
          });
        } catch (error) {
          if (isAuthError(error)) {
            if (isAuthSessionMissingError(error)) {
              await this._removeSession();
              await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
            }
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Updates user data for a logged in user.
       */
      async updateUser(attributes, options = {}) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._updateUser(attributes, options);
        });
      }
      async _updateUser(attributes, options = {}) {
        try {
          return await this._useSession(async (result) => {
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              throw sessionError;
            }
            if (!sessionData.session) {
              throw new AuthSessionMissingError();
            }
            const session = sessionData.session;
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce" && attributes.email != null) {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            const { data, error: userError } = await _request(this.fetch, "PUT", `${this.url}/user`, {
              headers: this.headers,
              redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
              body: Object.assign(Object.assign({}, attributes), { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
              jwt: session.access_token,
              xform: _userResponse
            });
            if (userError)
              throw userError;
            session.user = data.user;
            await this._saveSession(session);
            await this._notifyAllSubscribers("USER_UPDATED", session);
            return { data: { user: session.user }, error: null };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
       * If the refresh token or access token in the current session is invalid, an error will be thrown.
       * @param currentSession The current session that minimally contains an access token and refresh token.
       */
      async setSession(currentSession) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._setSession(currentSession);
        });
      }
      async _setSession(currentSession) {
        try {
          if (!currentSession.access_token || !currentSession.refresh_token) {
            throw new AuthSessionMissingError();
          }
          const timeNow = Date.now() / 1e3;
          let expiresAt2 = timeNow;
          let hasExpired = true;
          let session = null;
          const { payload } = decodeJWT(currentSession.access_token);
          if (payload.exp) {
            expiresAt2 = payload.exp;
            hasExpired = expiresAt2 <= timeNow;
          }
          if (hasExpired) {
            const { session: refreshedSession, error } = await this._callRefreshToken(currentSession.refresh_token);
            if (error) {
              return { data: { user: null, session: null }, error };
            }
            if (!refreshedSession) {
              return { data: { user: null, session: null }, error: null };
            }
            session = refreshedSession;
          } else {
            const { data, error } = await this._getUser(currentSession.access_token);
            if (error) {
              throw error;
            }
            session = {
              access_token: currentSession.access_token,
              refresh_token: currentSession.refresh_token,
              user: data.user,
              token_type: "bearer",
              expires_in: expiresAt2 - timeNow,
              expires_at: expiresAt2
            };
            await this._saveSession(session);
            await this._notifyAllSubscribers("SIGNED_IN", session);
          }
          return { data: { user: session.user, session }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { session: null, user: null }, error };
          }
          throw error;
        }
      }
      /**
       * Returns a new session, regardless of expiry status.
       * Takes in an optional current session. If not passed in, then refreshSession() will attempt to retrieve it from getSession().
       * If the current session's refresh token is invalid, an error will be thrown.
       * @param currentSession The current session. If passed in, it must contain a refresh token.
       */
      async refreshSession(currentSession) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._refreshSession(currentSession);
        });
      }
      async _refreshSession(currentSession) {
        try {
          return await this._useSession(async (result) => {
            var _a;
            if (!currentSession) {
              const { data, error: error2 } = result;
              if (error2) {
                throw error2;
              }
              currentSession = (_a = data.session) !== null && _a !== void 0 ? _a : void 0;
            }
            if (!(currentSession === null || currentSession === void 0 ? void 0 : currentSession.refresh_token)) {
              throw new AuthSessionMissingError();
            }
            const { session, error } = await this._callRefreshToken(currentSession.refresh_token);
            if (error) {
              return { data: { user: null, session: null }, error };
            }
            if (!session) {
              return { data: { user: null, session: null }, error: null };
            }
            return { data: { user: session.user, session }, error: null };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { user: null, session: null }, error };
          }
          throw error;
        }
      }
      /**
       * Gets the session data from a URL string
       */
      async _getSessionFromURL(params, callbackUrlType) {
        try {
          if (!isBrowser())
            throw new AuthImplicitGrantRedirectError("No browser detected.");
          if (params.error || params.error_description || params.error_code) {
            throw new AuthImplicitGrantRedirectError(params.error_description || "Error in URL with unspecified error_description", {
              error: params.error || "unspecified_error",
              code: params.error_code || "unspecified_code"
            });
          }
          switch (callbackUrlType) {
            case "implicit":
              if (this.flowType === "pkce") {
                throw new AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow url.");
              }
              break;
            case "pkce":
              if (this.flowType === "implicit") {
                throw new AuthImplicitGrantRedirectError("Not a valid implicit grant flow url.");
              }
              break;
            default:
          }
          if (callbackUrlType === "pkce") {
            this._debug("#_initialize()", "begin", "is PKCE flow", true);
            if (!params.code)
              throw new AuthPKCEGrantCodeExchangeError("No code detected.");
            const { data: data2, error: error2 } = await this._exchangeCodeForSession(params.code);
            if (error2)
              throw error2;
            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            window.history.replaceState(window.history.state, "", url.toString());
            return { data: { session: data2.session, redirectType: null }, error: null };
          }
          const { provider_token, provider_refresh_token, access_token, refresh_token, expires_in, expires_at, token_type } = params;
          if (!access_token || !expires_in || !refresh_token || !token_type) {
            throw new AuthImplicitGrantRedirectError("No session defined in URL");
          }
          const timeNow = Math.round(Date.now() / 1e3);
          const expiresIn = parseInt(expires_in);
          let expiresAt2 = timeNow + expiresIn;
          if (expires_at) {
            expiresAt2 = parseInt(expires_at);
          }
          const actuallyExpiresIn = expiresAt2 - timeNow;
          if (actuallyExpiresIn * 1e3 <= AUTO_REFRESH_TICK_DURATION_MS) {
            console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${actuallyExpiresIn}s, should have been closer to ${expiresIn}s`);
          }
          const issuedAt = expiresAt2 - expiresIn;
          if (timeNow - issuedAt >= 120) {
            console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale", issuedAt, expiresAt2, timeNow);
          } else if (timeNow - issuedAt < 0) {
            console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew", issuedAt, expiresAt2, timeNow);
          }
          const { data, error } = await this._getUser(access_token);
          if (error)
            throw error;
          const session = {
            provider_token,
            provider_refresh_token,
            access_token,
            expires_in: expiresIn,
            expires_at: expiresAt2,
            refresh_token,
            token_type,
            user: data.user
          };
          window.location.hash = "";
          this._debug("#_getSessionFromURL()", "clearing window.location.hash");
          return { data: { session, redirectType: params.type }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { session: null, redirectType: null }, error };
          }
          throw error;
        }
      }
      /**
       * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
       */
      _isImplicitGrantCallback(params) {
        return Boolean(params.access_token || params.error_description);
      }
      /**
       * Checks if the current URL and backing storage contain parameters given by a PKCE flow
       */
      async _isPKCECallback(params) {
        const currentStorageContent = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
        return !!(params.code && currentStorageContent);
      }
      /**
       * Inside a browser context, `signOut()` will remove the logged in user from the browser session and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
       *
       * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
       * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
       *
       * If using `others` scope, no `SIGNED_OUT` event is fired!
       */
      async signOut(options = { scope: "global" }) {
        await this.initializePromise;
        return await this._acquireLock(-1, async () => {
          return await this._signOut(options);
        });
      }
      async _signOut({ scope } = { scope: "global" }) {
        return await this._useSession(async (result) => {
          var _a;
          const { data, error: sessionError } = result;
          if (sessionError) {
            return { error: sessionError };
          }
          const accessToken = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token;
          if (accessToken) {
            const { error } = await this.admin.signOut(accessToken, scope);
            if (error) {
              if (!(isAuthApiError(error) && (error.status === 404 || error.status === 401 || error.status === 403))) {
                return { error };
              }
            }
          }
          if (scope !== "others") {
            await this._removeSession();
            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          }
          return { error: null };
        });
      }
      /**
       * Receive a notification every time an auth event happens.
       * @param callback A callback function to be invoked when an auth event happens.
       */
      onAuthStateChange(callback) {
        const id = uuid();
        const subscription = {
          id,
          callback,
          unsubscribe: /* @__PURE__ */ __name(() => {
            this._debug("#unsubscribe()", "state change callback with id removed", id);
            this.stateChangeEmitters.delete(id);
          }, "unsubscribe")
        };
        this._debug("#onAuthStateChange()", "registered callback with id", id);
        this.stateChangeEmitters.set(id, subscription);
        (async () => {
          await this.initializePromise;
          await this._acquireLock(-1, async () => {
            this._emitInitialSession(id);
          });
        })();
        return { data: { subscription } };
      }
      async _emitInitialSession(id) {
        return await this._useSession(async (result) => {
          var _a, _b;
          try {
            const { data: { session }, error } = result;
            if (error)
              throw error;
            await ((_a = this.stateChangeEmitters.get(id)) === null || _a === void 0 ? void 0 : _a.callback("INITIAL_SESSION", session));
            this._debug("INITIAL_SESSION", "callback id", id, "session", session);
          } catch (err) {
            await ((_b = this.stateChangeEmitters.get(id)) === null || _b === void 0 ? void 0 : _b.callback("INITIAL_SESSION", null));
            this._debug("INITIAL_SESSION", "callback id", id, "error", err);
            console.error(err);
          }
        });
      }
      /**
       * Sends a password reset request to an email address. This method supports the PKCE flow.
       *
       * @param email The email address of the user.
       * @param options.redirectTo The URL to send the user to after they click the password reset link.
       * @param options.captchaToken Verification token received when the user completes the captcha on the site.
       */
      async resetPasswordForEmail(email, options = {}) {
        let codeChallenge = null;
        let codeChallengeMethod = null;
        if (this.flowType === "pkce") {
          ;
          [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
            this.storage,
            this.storageKey,
            true
            // isPasswordRecovery
          );
        }
        try {
          return await _request(this.fetch, "POST", `${this.url}/recover`, {
            body: {
              email,
              code_challenge: codeChallenge,
              code_challenge_method: codeChallengeMethod,
              gotrue_meta_security: { captcha_token: options.captchaToken }
            },
            headers: this.headers,
            redirectTo: options.redirectTo
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Gets all the identities linked to a user.
       */
      async getUserIdentities() {
        var _a;
        try {
          const { data, error } = await this.getUser();
          if (error)
            throw error;
          return { data: { identities: (_a = data.user.identities) !== null && _a !== void 0 ? _a : [] }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Links an oauth identity to an existing user.
       * This method supports the PKCE flow.
       */
      async linkIdentity(credentials) {
        var _a;
        try {
          const { data, error } = await this._useSession(async (result) => {
            var _a2, _b, _c, _d, _e;
            const { data: data2, error: error2 } = result;
            if (error2)
              throw error2;
            const url = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, credentials.provider, {
              redirectTo: (_a2 = credentials.options) === null || _a2 === void 0 ? void 0 : _a2.redirectTo,
              scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
              queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
              skipBrowserRedirect: true
            });
            return await _request(this.fetch, "GET", url, {
              headers: this.headers,
              jwt: (_e = (_d = data2.session) === null || _d === void 0 ? void 0 : _d.access_token) !== null && _e !== void 0 ? _e : void 0
            });
          });
          if (error)
            throw error;
          if (isBrowser() && !((_a = credentials.options) === null || _a === void 0 ? void 0 : _a.skipBrowserRedirect)) {
            window.location.assign(data === null || data === void 0 ? void 0 : data.url);
          }
          return { data: { provider: credentials.provider, url: data === null || data === void 0 ? void 0 : data.url }, error: null };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: { provider: credentials.provider, url: null }, error };
          }
          throw error;
        }
      }
      /**
       * Unlinks an identity from a user by deleting it. The user will no longer be able to sign in with that identity once it's unlinked.
       */
      async unlinkIdentity(identity) {
        try {
          return await this._useSession(async (result) => {
            var _a, _b;
            const { data, error } = result;
            if (error) {
              throw error;
            }
            return await _request(this.fetch, "DELETE", `${this.url}/user/identities/${identity.identity_id}`, {
              headers: this.headers,
              jwt: (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : void 0
            });
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * Generates a new JWT.
       * @param refreshToken A valid refresh token that was returned on login.
       */
      async _refreshAccessToken(refreshToken) {
        const debugName = `#_refreshAccessToken(${refreshToken.substring(0, 5)}...)`;
        this._debug(debugName, "begin");
        try {
          const startedAt = Date.now();
          return await retryable(async (attempt) => {
            if (attempt > 0) {
              await sleep(200 * Math.pow(2, attempt - 1));
            }
            this._debug(debugName, "refreshing attempt", attempt);
            return await _request(this.fetch, "POST", `${this.url}/token?grant_type=refresh_token`, {
              body: { refresh_token: refreshToken },
              headers: this.headers,
              xform: _sessionResponse
            });
          }, (attempt, error) => {
            const nextBackOffInterval = 200 * Math.pow(2, attempt);
            return error && isAuthRetryableFetchError(error) && // retryable only if the request can be sent before the backoff overflows the tick duration
            Date.now() + nextBackOffInterval - startedAt < AUTO_REFRESH_TICK_DURATION_MS;
          });
        } catch (error) {
          this._debug(debugName, "error", error);
          if (isAuthError(error)) {
            return { data: { session: null, user: null }, error };
          }
          throw error;
        } finally {
          this._debug(debugName, "end");
        }
      }
      _isValidSession(maybeSession) {
        const isValidSession = typeof maybeSession === "object" && maybeSession !== null && "access_token" in maybeSession && "refresh_token" in maybeSession && "expires_at" in maybeSession;
        return isValidSession;
      }
      async _handleProviderSignIn(provider, options) {
        const url = await this._getUrlForProvider(`${this.url}/authorize`, provider, {
          redirectTo: options.redirectTo,
          scopes: options.scopes,
          queryParams: options.queryParams
        });
        this._debug("#_handleProviderSignIn()", "provider", provider, "options", options, "url", url);
        if (isBrowser() && !options.skipBrowserRedirect) {
          window.location.assign(url);
        }
        return { data: { provider, url }, error: null };
      }
      /**
       * Recovers the session from LocalStorage and refreshes the token
       * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
       */
      async _recoverAndRefresh() {
        var _a, _b;
        const debugName = "#_recoverAndRefresh()";
        this._debug(debugName, "begin");
        try {
          const currentSession = await getItemAsync(this.storage, this.storageKey);
          if (currentSession && this.userStorage) {
            let maybeUser = await getItemAsync(this.userStorage, this.storageKey + "-user");
            if (!this.storage.isServer && Object.is(this.storage, this.userStorage) && !maybeUser) {
              maybeUser = { user: currentSession.user };
              await setItemAsync(this.userStorage, this.storageKey + "-user", maybeUser);
            }
            currentSession.user = (_a = maybeUser === null || maybeUser === void 0 ? void 0 : maybeUser.user) !== null && _a !== void 0 ? _a : userNotAvailableProxy();
          } else if (currentSession && !currentSession.user) {
            if (!currentSession.user) {
              const separateUser = await getItemAsync(this.storage, this.storageKey + "-user");
              if (separateUser && (separateUser === null || separateUser === void 0 ? void 0 : separateUser.user)) {
                currentSession.user = separateUser.user;
                await removeItemAsync(this.storage, this.storageKey + "-user");
                await setItemAsync(this.storage, this.storageKey, currentSession);
              } else {
                currentSession.user = userNotAvailableProxy();
              }
            }
          }
          this._debug(debugName, "session from storage", currentSession);
          if (!this._isValidSession(currentSession)) {
            this._debug(debugName, "session is not valid");
            if (currentSession !== null) {
              await this._removeSession();
            }
            return;
          }
          const expiresWithMargin = ((_b = currentSession.expires_at) !== null && _b !== void 0 ? _b : Infinity) * 1e3 - Date.now() < EXPIRY_MARGIN_MS;
          this._debug(debugName, `session has${expiresWithMargin ? "" : " not"} expired with margin of ${EXPIRY_MARGIN_MS}s`);
          if (expiresWithMargin) {
            if (this.autoRefreshToken && currentSession.refresh_token) {
              const { error } = await this._callRefreshToken(currentSession.refresh_token);
              if (error) {
                console.error(error);
                if (!isAuthRetryableFetchError(error)) {
                  this._debug(debugName, "refresh failed with a non-retryable error, removing the session", error);
                  await this._removeSession();
                }
              }
            }
          } else if (currentSession.user && currentSession.user.__isUserNotAvailableProxy === true) {
            try {
              const { data, error: userError } = await this._getUser(currentSession.access_token);
              if (!userError && (data === null || data === void 0 ? void 0 : data.user)) {
                currentSession.user = data.user;
                await this._saveSession(currentSession);
                await this._notifyAllSubscribers("SIGNED_IN", currentSession);
              } else {
                this._debug(debugName, "could not get user data, skipping SIGNED_IN notification");
              }
            } catch (getUserError) {
              console.error("Error getting user data:", getUserError);
              this._debug(debugName, "error getting user data, skipping SIGNED_IN notification", getUserError);
            }
          } else {
            await this._notifyAllSubscribers("SIGNED_IN", currentSession);
          }
        } catch (err) {
          this._debug(debugName, "error", err);
          console.error(err);
          return;
        } finally {
          this._debug(debugName, "end");
        }
      }
      async _callRefreshToken(refreshToken) {
        var _a, _b;
        if (!refreshToken) {
          throw new AuthSessionMissingError();
        }
        if (this.refreshingDeferred) {
          return this.refreshingDeferred.promise;
        }
        const debugName = `#_callRefreshToken(${refreshToken.substring(0, 5)}...)`;
        this._debug(debugName, "begin");
        try {
          this.refreshingDeferred = new Deferred();
          const { data, error } = await this._refreshAccessToken(refreshToken);
          if (error)
            throw error;
          if (!data.session)
            throw new AuthSessionMissingError();
          await this._saveSession(data.session);
          await this._notifyAllSubscribers("TOKEN_REFRESHED", data.session);
          const result = { session: data.session, error: null };
          this.refreshingDeferred.resolve(result);
          return result;
        } catch (error) {
          this._debug(debugName, "error", error);
          if (isAuthError(error)) {
            const result = { session: null, error };
            if (!isAuthRetryableFetchError(error)) {
              await this._removeSession();
            }
            (_a = this.refreshingDeferred) === null || _a === void 0 ? void 0 : _a.resolve(result);
            return result;
          }
          (_b = this.refreshingDeferred) === null || _b === void 0 ? void 0 : _b.reject(error);
          throw error;
        } finally {
          this.refreshingDeferred = null;
          this._debug(debugName, "end");
        }
      }
      async _notifyAllSubscribers(event, session, broadcast = true) {
        const debugName = `#_notifyAllSubscribers(${event})`;
        this._debug(debugName, "begin", session, `broadcast = ${broadcast}`);
        try {
          if (this.broadcastChannel && broadcast) {
            this.broadcastChannel.postMessage({ event, session });
          }
          const errors = [];
          const promises = Array.from(this.stateChangeEmitters.values()).map(async (x2) => {
            try {
              await x2.callback(event, session);
            } catch (e2) {
              errors.push(e2);
            }
          });
          await Promise.all(promises);
          if (errors.length > 0) {
            for (let i2 = 0; i2 < errors.length; i2 += 1) {
              console.error(errors[i2]);
            }
            throw errors[0];
          }
        } finally {
          this._debug(debugName, "end");
        }
      }
      /**
       * set currentSession and currentUser
       * process to _startAutoRefreshToken if possible
       */
      async _saveSession(session) {
        this._debug("#_saveSession()", session);
        this.suppressGetSessionWarning = true;
        const sessionToProcess = Object.assign({}, session);
        const userIsProxy = sessionToProcess.user && sessionToProcess.user.__isUserNotAvailableProxy === true;
        if (this.userStorage) {
          if (!userIsProxy && sessionToProcess.user) {
            await setItemAsync(this.userStorage, this.storageKey + "-user", {
              user: sessionToProcess.user
            });
          } else if (userIsProxy) {
          }
          const mainSessionData = Object.assign({}, sessionToProcess);
          delete mainSessionData.user;
          const clonedMainSessionData = deepClone(mainSessionData);
          await setItemAsync(this.storage, this.storageKey, clonedMainSessionData);
        } else {
          const clonedSession = deepClone(sessionToProcess);
          await setItemAsync(this.storage, this.storageKey, clonedSession);
        }
      }
      async _removeSession() {
        this._debug("#_removeSession()");
        await removeItemAsync(this.storage, this.storageKey);
        await removeItemAsync(this.storage, this.storageKey + "-code-verifier");
        await removeItemAsync(this.storage, this.storageKey + "-user");
        if (this.userStorage) {
          await removeItemAsync(this.userStorage, this.storageKey + "-user");
        }
        await this._notifyAllSubscribers("SIGNED_OUT", null);
      }
      /**
       * Removes any registered visibilitychange callback.
       *
       * {@see #startAutoRefresh}
       * {@see #stopAutoRefresh}
       */
      _removeVisibilityChangedCallback() {
        this._debug("#_removeVisibilityChangedCallback()");
        const callback = this.visibilityChangedCallback;
        this.visibilityChangedCallback = null;
        try {
          if (callback && isBrowser() && (window === null || window === void 0 ? void 0 : window.removeEventListener)) {
            window.removeEventListener("visibilitychange", callback);
          }
        } catch (e2) {
          console.error("removing visibilitychange callback failed", e2);
        }
      }
      /**
       * This is the private implementation of {@link #startAutoRefresh}. Use this
       * within the library.
       */
      async _startAutoRefresh() {
        await this._stopAutoRefresh();
        this._debug("#_startAutoRefresh()");
        const ticker = setInterval(() => this._autoRefreshTokenTick(), AUTO_REFRESH_TICK_DURATION_MS);
        this.autoRefreshTicker = ticker;
        if (ticker && typeof ticker === "object" && typeof ticker.unref === "function") {
          ticker.unref();
        } else if (typeof Deno !== "undefined" && typeof Deno.unrefTimer === "function") {
          Deno.unrefTimer(ticker);
        }
        setTimeout(async () => {
          await this.initializePromise;
          await this._autoRefreshTokenTick();
        }, 0);
      }
      /**
       * This is the private implementation of {@link #stopAutoRefresh}. Use this
       * within the library.
       */
      async _stopAutoRefresh() {
        this._debug("#_stopAutoRefresh()");
        const ticker = this.autoRefreshTicker;
        this.autoRefreshTicker = null;
        if (ticker) {
          clearInterval(ticker);
        }
      }
      /**
       * Starts an auto-refresh process in the background. The session is checked
       * every few seconds. Close to the time of expiration a process is started to
       * refresh the session. If refreshing fails it will be retried for as long as
       * necessary.
       *
       * If you set the {@link GoTrueClientOptions#autoRefreshToken} you don't need
       * to call this function, it will be called for you.
       *
       * On browsers the refresh process works only when the tab/window is in the
       * foreground to conserve resources as well as prevent race conditions and
       * flooding auth with requests. If you call this method any managed
       * visibility change callback will be removed and you must manage visibility
       * changes on your own.
       *
       * On non-browser platforms the refresh process works *continuously* in the
       * background, which may not be desirable. You should hook into your
       * platform's foreground indication mechanism and call these methods
       * appropriately to conserve resources.
       *
       * {@see #stopAutoRefresh}
       */
      async startAutoRefresh() {
        this._removeVisibilityChangedCallback();
        await this._startAutoRefresh();
      }
      /**
       * Stops an active auto refresh process running in the background (if any).
       *
       * If you call this method any managed visibility change callback will be
       * removed and you must manage visibility changes on your own.
       *
       * See {@link #startAutoRefresh} for more details.
       */
      async stopAutoRefresh() {
        this._removeVisibilityChangedCallback();
        await this._stopAutoRefresh();
      }
      /**
       * Runs the auto refresh token tick.
       */
      async _autoRefreshTokenTick() {
        this._debug("#_autoRefreshTokenTick()", "begin");
        try {
          await this._acquireLock(0, async () => {
            try {
              const now = Date.now();
              try {
                return await this._useSession(async (result) => {
                  const { data: { session } } = result;
                  if (!session || !session.refresh_token || !session.expires_at) {
                    this._debug("#_autoRefreshTokenTick()", "no session");
                    return;
                  }
                  const expiresInTicks = Math.floor((session.expires_at * 1e3 - now) / AUTO_REFRESH_TICK_DURATION_MS);
                  this._debug("#_autoRefreshTokenTick()", `access token expires in ${expiresInTicks} ticks, a tick lasts ${AUTO_REFRESH_TICK_DURATION_MS}ms, refresh threshold is ${AUTO_REFRESH_TICK_THRESHOLD} ticks`);
                  if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
                    await this._callRefreshToken(session.refresh_token);
                  }
                });
              } catch (e2) {
                console.error("Auto refresh tick failed with error. This is likely a transient error.", e2);
              }
            } finally {
              this._debug("#_autoRefreshTokenTick()", "end");
            }
          });
        } catch (e2) {
          if (e2.isAcquireTimeout || e2 instanceof LockAcquireTimeoutError) {
            this._debug("auto refresh token tick lock not available");
          } else {
            throw e2;
          }
        }
      }
      /**
       * Registers callbacks on the browser / platform, which in-turn run
       * algorithms when the browser window/tab are in foreground. On non-browser
       * platforms it assumes always foreground.
       */
      async _handleVisibilityChange() {
        this._debug("#_handleVisibilityChange()");
        if (!isBrowser() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
          if (this.autoRefreshToken) {
            this.startAutoRefresh();
          }
          return false;
        }
        try {
          this.visibilityChangedCallback = async () => await this._onVisibilityChanged(false);
          window === null || window === void 0 ? void 0 : window.addEventListener("visibilitychange", this.visibilityChangedCallback);
          await this._onVisibilityChanged(true);
        } catch (error) {
          console.error("_handleVisibilityChange", error);
        }
      }
      /**
       * Callback registered with `window.addEventListener('visibilitychange')`.
       */
      async _onVisibilityChanged(calledFromInitialize) {
        const methodName = `#_onVisibilityChanged(${calledFromInitialize})`;
        this._debug(methodName, "visibilityState", document.visibilityState);
        if (document.visibilityState === "visible") {
          if (this.autoRefreshToken) {
            this._startAutoRefresh();
          }
          if (!calledFromInitialize) {
            await this.initializePromise;
            await this._acquireLock(-1, async () => {
              if (document.visibilityState !== "visible") {
                this._debug(methodName, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting");
                return;
              }
              await this._recoverAndRefresh();
            });
          }
        } else if (document.visibilityState === "hidden") {
          if (this.autoRefreshToken) {
            this._stopAutoRefresh();
          }
        }
      }
      /**
       * Generates the relevant login URL for a third-party provider.
       * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
       * @param options.scopes A space-separated list of scopes granted to the OAuth application.
       * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
       */
      async _getUrlForProvider(url, provider, options) {
        const urlParams = [`provider=${encodeURIComponent(provider)}`];
        if (options === null || options === void 0 ? void 0 : options.redirectTo) {
          urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`);
        }
        if (options === null || options === void 0 ? void 0 : options.scopes) {
          urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`);
        }
        if (this.flowType === "pkce") {
          const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
          const flowParams = new URLSearchParams({
            code_challenge: `${encodeURIComponent(codeChallenge)}`,
            code_challenge_method: `${encodeURIComponent(codeChallengeMethod)}`
          });
          urlParams.push(flowParams.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.queryParams) {
          const query = new URLSearchParams(options.queryParams);
          urlParams.push(query.toString());
        }
        if (options === null || options === void 0 ? void 0 : options.skipBrowserRedirect) {
          urlParams.push(`skip_http_redirect=${options.skipBrowserRedirect}`);
        }
        return `${url}?${urlParams.join("&")}`;
      }
      async _unenroll(params) {
        try {
          return await this._useSession(async (result) => {
            var _a;
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              return { data: null, error: sessionError };
            }
            return await _request(this.fetch, "DELETE", `${this.url}/factors/${params.factorId}`, {
              headers: this.headers,
              jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
            });
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      async _enroll(params) {
        try {
          return await this._useSession(async (result) => {
            var _a, _b;
            const { data: sessionData, error: sessionError } = result;
            if (sessionError) {
              return { data: null, error: sessionError };
            }
            const body2 = Object.assign({ friendly_name: params.friendlyName, factor_type: params.factorType }, params.factorType === "phone" ? { phone: params.phone } : { issuer: params.issuer });
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors`, {
              body: body2,
              headers: this.headers,
              jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
            });
            if (error) {
              return { data: null, error };
            }
            if (params.factorType === "totp" && ((_b = data === null || data === void 0 ? void 0 : data.totp) === null || _b === void 0 ? void 0 : _b.qr_code)) {
              data.totp.qr_code = `data:image/svg+xml;utf-8,${data.totp.qr_code}`;
            }
            return { data, error: null };
          });
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
      /**
       * {@see GoTrueMFAApi#verify}
       */
      async _verify(params) {
        return this._acquireLock(-1, async () => {
          try {
            return await this._useSession(async (result) => {
              var _a;
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/verify`, {
                body: { code: params.code, challenge_id: params.challengeId },
                headers: this.headers,
                jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
              });
              if (error) {
                return { data: null, error };
              }
              await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + data.expires_in }, data));
              await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", data);
              return { data, error };
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * {@see GoTrueMFAApi#challenge}
       */
      async _challenge(params) {
        return this._acquireLock(-1, async () => {
          try {
            return await this._useSession(async (result) => {
              var _a;
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              return await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/challenge`, {
                body: { channel: params.channel },
                headers: this.headers,
                jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
              });
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        });
      }
      /**
       * {@see GoTrueMFAApi#challengeAndVerify}
       */
      async _challengeAndVerify(params) {
        const { data: challengeData, error: challengeError } = await this._challenge({
          factorId: params.factorId
        });
        if (challengeError) {
          return { data: null, error: challengeError };
        }
        return await this._verify({
          factorId: params.factorId,
          challengeId: challengeData.id,
          code: params.code
        });
      }
      /**
       * {@see GoTrueMFAApi#listFactors}
       */
      async _listFactors() {
        const { data: { user }, error: userError } = await this.getUser();
        if (userError) {
          return { data: null, error: userError };
        }
        const factors = (user === null || user === void 0 ? void 0 : user.factors) || [];
        const totp = factors.filter((factor) => factor.factor_type === "totp" && factor.status === "verified");
        const phone = factors.filter((factor) => factor.factor_type === "phone" && factor.status === "verified");
        return {
          data: {
            all: factors,
            totp,
            phone
          },
          error: null
        };
      }
      /**
       * {@see GoTrueMFAApi#getAuthenticatorAssuranceLevel}
       */
      async _getAuthenticatorAssuranceLevel() {
        return this._acquireLock(-1, async () => {
          return await this._useSession(async (result) => {
            var _a, _b;
            const { data: { session }, error: sessionError } = result;
            if (sessionError) {
              return { data: null, error: sessionError };
            }
            if (!session) {
              return {
                data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] },
                error: null
              };
            }
            const { payload } = decodeJWT(session.access_token);
            let currentLevel = null;
            if (payload.aal) {
              currentLevel = payload.aal;
            }
            let nextLevel = currentLevel;
            const verifiedFactors = (_b = (_a = session.user.factors) === null || _a === void 0 ? void 0 : _a.filter((factor) => factor.status === "verified")) !== null && _b !== void 0 ? _b : [];
            if (verifiedFactors.length > 0) {
              nextLevel = "aal2";
            }
            const currentAuthenticationMethods = payload.amr || [];
            return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null };
          });
        });
      }
      async fetchJwk(kid, jwks = { keys: [] }) {
        let jwk = jwks.keys.find((key) => key.kid === kid);
        if (jwk) {
          return jwk;
        }
        const now = Date.now();
        jwk = this.jwks.keys.find((key) => key.kid === kid);
        if (jwk && this.jwks_cached_at + JWKS_TTL > now) {
          return jwk;
        }
        const { data, error } = await _request(this.fetch, "GET", `${this.url}/.well-known/jwks.json`, {
          headers: this.headers
        });
        if (error) {
          throw error;
        }
        if (!data.keys || data.keys.length === 0) {
          return null;
        }
        this.jwks = data;
        this.jwks_cached_at = now;
        jwk = data.keys.find((key) => key.kid === kid);
        if (!jwk) {
          return null;
        }
        return jwk;
      }
      /**
       * Extracts the JWT claims present in the access token by first verifying the
       * JWT against the server's JSON Web Key Set endpoint
       * `/.well-known/jwks.json` which is often cached, resulting in significantly
       * faster responses. Prefer this method over {@link #getUser} which always
       * sends a request to the Auth server for each JWT.
       *
       * If the project is not using an asymmetric JWT signing key (like ECC or
       * RSA) it always sends a request to the Auth server (similar to {@link
       * #getUser}) to verify the JWT.
       *
       * @param jwt An optional specific JWT you wish to verify, not the one you
       *            can obtain from {@link #getSession}.
       * @param options Various additional options that allow you to customize the
       *                behavior of this method.
       */
      async getClaims(jwt, options = {}) {
        try {
          let token = jwt;
          if (!token) {
            const { data, error } = await this.getSession();
            if (error || !data.session) {
              return { data: null, error };
            }
            token = data.session.access_token;
          }
          const { header, payload, signature, raw: { header: rawHeader, payload: rawPayload } } = decodeJWT(token);
          if (!(options === null || options === void 0 ? void 0 : options.allowExpired)) {
            validateExp(payload.exp);
          }
          const signingKey = !header.alg || header.alg.startsWith("HS") || !header.kid || !("crypto" in globalThis && "subtle" in globalThis.crypto) ? null : await this.fetchJwk(header.kid, (options === null || options === void 0 ? void 0 : options.keys) ? { keys: options.keys } : options === null || options === void 0 ? void 0 : options.jwks);
          if (!signingKey) {
            const { error } = await this.getUser(token);
            if (error) {
              throw error;
            }
            return {
              data: {
                claims: payload,
                header,
                signature
              },
              error: null
            };
          }
          const algorithm = getAlgorithm(header.alg);
          const publicKey = await crypto.subtle.importKey("jwk", signingKey, algorithm, true, [
            "verify"
          ]);
          const isValid = await crypto.subtle.verify(algorithm, publicKey, signature, stringToUint8Array(`${rawHeader}.${rawPayload}`));
          if (!isValid) {
            throw new AuthInvalidJwtError("Invalid JWT signature");
          }
          return {
            data: {
              claims: payload,
              header,
              signature
            },
            error: null
          };
        } catch (error) {
          if (isAuthError(error)) {
            return { data: null, error };
          }
          throw error;
        }
      }
    };
    GoTrueClient.nextInstanceID = 0;
  }
});

// ../node_modules/@supabase/auth-js/dist/module/AuthAdminApi.js
var AuthAdminApi, AuthAdminApi_default;
var init_AuthAdminApi = __esm({
  "../node_modules/@supabase/auth-js/dist/module/AuthAdminApi.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_GoTrueAdminApi();
    AuthAdminApi = GoTrueAdminApi;
    AuthAdminApi_default = AuthAdminApi;
  }
});

// ../node_modules/@supabase/auth-js/dist/module/AuthClient.js
var AuthClient, AuthClient_default;
var init_AuthClient = __esm({
  "../node_modules/@supabase/auth-js/dist/module/AuthClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_GoTrueClient();
    AuthClient = GoTrueClient;
    AuthClient_default = AuthClient;
  }
});

// ../node_modules/@supabase/auth-js/dist/module/index.js
var init_module4 = __esm({
  "../node_modules/@supabase/auth-js/dist/module/index.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_GoTrueAdminApi();
    init_GoTrueClient();
    init_AuthAdminApi();
    init_AuthClient();
    init_types3();
    init_errors2();
    init_locks();
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js
var SupabaseAuthClient;
var init_SupabaseAuthClient = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module4();
    SupabaseAuthClient = class extends AuthClient_default {
      static {
        __name(this, "SupabaseAuthClient");
      }
      constructor(options) {
        super(options);
      }
    };
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js
var __awaiter8, SupabaseClient;
var init_SupabaseClient = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module();
    init_wrapper();
    init_module2();
    init_module3();
    init_constants3();
    init_fetch2();
    init_helpers2();
    init_SupabaseAuthClient();
    __awaiter8 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      __name(adopt, "adopt");
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(fulfilled, "fulfilled");
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e2) {
            reject(e2);
          }
        }
        __name(rejected, "rejected");
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        __name(step, "step");
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    SupabaseClient = class {
      static {
        __name(this, "SupabaseClient");
      }
      /**
       * Create a new client for use in the browser.
       * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.
       * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.
       * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.
       * @param options.auth.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
       * @param options.auth.persistSession Set to "true" if you want to automatically save the user session into local storage.
       * @param options.auth.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
       * @param options.realtime Options passed along to realtime-js constructor.
       * @param options.storage Options passed along to the storage-js constructor.
       * @param options.global.fetch A custom fetch implementation.
       * @param options.global.headers Any additional headers to send with each network request.
       */
      constructor(supabaseUrl, supabaseKey, options) {
        var _a, _b, _c;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        if (!supabaseUrl)
          throw new Error("supabaseUrl is required.");
        if (!supabaseKey)
          throw new Error("supabaseKey is required.");
        const _supabaseUrl = ensureTrailingSlash(supabaseUrl);
        const baseUrl = new URL(_supabaseUrl);
        this.realtimeUrl = new URL("realtime/v1", baseUrl);
        this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws");
        this.authUrl = new URL("auth/v1", baseUrl);
        this.storageUrl = new URL("storage/v1", baseUrl);
        this.functionsUrl = new URL("functions/v1", baseUrl);
        const defaultStorageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
        const DEFAULTS = {
          db: DEFAULT_DB_OPTIONS,
          realtime: DEFAULT_REALTIME_OPTIONS,
          auth: Object.assign(Object.assign({}, DEFAULT_AUTH_OPTIONS), { storageKey: defaultStorageKey }),
          global: DEFAULT_GLOBAL_OPTIONS
        };
        const settings = applySettingDefaults(options !== null && options !== void 0 ? options : {}, DEFAULTS);
        this.storageKey = (_a = settings.auth.storageKey) !== null && _a !== void 0 ? _a : "";
        this.headers = (_b = settings.global.headers) !== null && _b !== void 0 ? _b : {};
        if (!settings.accessToken) {
          this.auth = this._initSupabaseAuthClient((_c = settings.auth) !== null && _c !== void 0 ? _c : {}, this.headers, settings.global.fetch);
        } else {
          this.accessToken = settings.accessToken;
          this.auth = new Proxy({}, {
            get: /* @__PURE__ */ __name((_2, prop) => {
              throw new Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(prop)} is not possible`);
            }, "get")
          });
        }
        this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch);
        this.realtime = this._initRealtimeClient(Object.assign({ headers: this.headers, accessToken: this._getAccessToken.bind(this) }, settings.realtime));
        this.rest = new PostgrestClient(new URL("rest/v1", baseUrl).href, {
          headers: this.headers,
          schema: settings.db.schema,
          fetch: this.fetch
        });
        this.storage = new StorageClient(this.storageUrl.href, this.headers, this.fetch, options === null || options === void 0 ? void 0 : options.storage);
        if (!settings.accessToken) {
          this._listenForAuthEvents();
        }
      }
      /**
       * Supabase Functions allows you to deploy and invoke edge functions.
       */
      get functions() {
        return new FunctionsClient(this.functionsUrl.href, {
          headers: this.headers,
          customFetch: this.fetch
        });
      }
      /**
       * Perform a query on a table or a view.
       *
       * @param relation - The table or view name to query
       */
      from(relation) {
        return this.rest.from(relation);
      }
      // NOTE: signatures must be kept in sync with PostgrestClient.schema
      /**
       * Select a schema to query or perform an function (rpc) call.
       *
       * The schema needs to be on the list of exposed schemas inside Supabase.
       *
       * @param schema - The schema to query
       */
      schema(schema) {
        return this.rest.schema(schema);
      }
      // NOTE: signatures must be kept in sync with PostgrestClient.rpc
      /**
       * Perform a function call.
       *
       * @param fn - The function name to call
       * @param args - The arguments to pass to the function call
       * @param options - Named parameters
       * @param options.head - When set to `true`, `data` will not be returned.
       * Useful if you only need the count.
       * @param options.get - When set to `true`, the function will be called with
       * read-only access mode.
       * @param options.count - Count algorithm to use to count rows returned by the
       * function. Only applicable for [set-returning
       * functions](https://www.postgresql.org/docs/current/functions-srf.html).
       *
       * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
       * hood.
       *
       * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
       * statistics under the hood.
       *
       * `"estimated"`: Uses exact count for low numbers and planned count for high
       * numbers.
       */
      rpc(fn, args = {}, options = {}) {
        return this.rest.rpc(fn, args, options);
      }
      /**
       * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.
       *
       * @param {string} name - The name of the Realtime channel.
       * @param {Object} opts - The options to pass to the Realtime channel.
       *
       */
      channel(name, opts = { config: {} }) {
        return this.realtime.channel(name, opts);
      }
      /**
       * Returns all Realtime channels.
       */
      getChannels() {
        return this.realtime.getChannels();
      }
      /**
       * Unsubscribes and removes Realtime channel from Realtime client.
       *
       * @param {RealtimeChannel} channel - The name of the Realtime channel.
       *
       */
      removeChannel(channel) {
        return this.realtime.removeChannel(channel);
      }
      /**
       * Unsubscribes and removes all Realtime channels from Realtime client.
       */
      removeAllChannels() {
        return this.realtime.removeAllChannels();
      }
      _getAccessToken() {
        var _a, _b;
        return __awaiter8(this, void 0, void 0, function* () {
          if (this.accessToken) {
            return yield this.accessToken();
          }
          const { data } = yield this.auth.getSession();
          return (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : this.supabaseKey;
        });
      }
      _initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, storageKey, flowType, lock, debug }, headers, fetch3) {
        const authHeaders = {
          Authorization: `Bearer ${this.supabaseKey}`,
          apikey: `${this.supabaseKey}`
        };
        return new SupabaseAuthClient({
          url: this.authUrl.href,
          headers: Object.assign(Object.assign({}, authHeaders), headers),
          storageKey,
          autoRefreshToken,
          persistSession,
          detectSessionInUrl,
          storage,
          flowType,
          lock,
          debug,
          fetch: fetch3,
          // auth checks if there is a custom authorizaiton header using this flag
          // so it knows whether to return an error when getUser is called with no session
          hasCustomAuthorizationHeader: "Authorization" in this.headers
        });
      }
      _initRealtimeClient(options) {
        return new RealtimeClient(this.realtimeUrl.href, Object.assign(Object.assign({}, options), { params: Object.assign({ apikey: this.supabaseKey }, options === null || options === void 0 ? void 0 : options.params) }));
      }
      _listenForAuthEvents() {
        let data = this.auth.onAuthStateChange((event, session) => {
          this._handleTokenChanged(event, "CLIENT", session === null || session === void 0 ? void 0 : session.access_token);
        });
        return data;
      }
      _handleTokenChanged(event, source, token) {
        if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && this.changedAccessToken !== token) {
          this.changedAccessToken = token;
        } else if (event === "SIGNED_OUT") {
          this.realtime.setAuth();
          if (source == "STORAGE")
            this.auth.signOut();
          this.changedAccessToken = void 0;
        }
      }
    };
  }
});

// ../node_modules/@supabase/supabase-js/dist/module/index.js
var module_exports = {};
__export(module_exports, {
  AuthAdminApi: () => AuthAdminApi_default,
  AuthApiError: () => AuthApiError,
  AuthClient: () => AuthClient_default,
  AuthError: () => AuthError,
  AuthImplicitGrantRedirectError: () => AuthImplicitGrantRedirectError,
  AuthInvalidCredentialsError: () => AuthInvalidCredentialsError,
  AuthInvalidJwtError: () => AuthInvalidJwtError,
  AuthInvalidTokenResponseError: () => AuthInvalidTokenResponseError,
  AuthPKCEGrantCodeExchangeError: () => AuthPKCEGrantCodeExchangeError,
  AuthRetryableFetchError: () => AuthRetryableFetchError,
  AuthSessionMissingError: () => AuthSessionMissingError,
  AuthUnknownError: () => AuthUnknownError,
  AuthWeakPasswordError: () => AuthWeakPasswordError,
  CustomAuthError: () => CustomAuthError,
  FunctionRegion: () => FunctionRegion,
  FunctionsError: () => FunctionsError,
  FunctionsFetchError: () => FunctionsFetchError,
  FunctionsHttpError: () => FunctionsHttpError,
  FunctionsRelayError: () => FunctionsRelayError,
  GoTrueAdminApi: () => GoTrueAdminApi,
  GoTrueClient: () => GoTrueClient,
  NavigatorLockAcquireTimeoutError: () => NavigatorLockAcquireTimeoutError,
  PostgrestError: () => PostgrestError,
  REALTIME_CHANNEL_STATES: () => REALTIME_CHANNEL_STATES,
  REALTIME_LISTEN_TYPES: () => REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT: () => REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  REALTIME_PRESENCE_LISTEN_EVENTS: () => REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES: () => REALTIME_SUBSCRIBE_STATES,
  RealtimeChannel: () => RealtimeChannel,
  RealtimeClient: () => RealtimeClient,
  RealtimePresence: () => RealtimePresence,
  SIGN_OUT_SCOPES: () => SIGN_OUT_SCOPES,
  SupabaseClient: () => SupabaseClient,
  WebSocketFactory: () => websocket_factory_default,
  createClient: () => createClient,
  isAuthApiError: () => isAuthApiError,
  isAuthError: () => isAuthError,
  isAuthImplicitGrantRedirectError: () => isAuthImplicitGrantRedirectError,
  isAuthRetryableFetchError: () => isAuthRetryableFetchError,
  isAuthSessionMissingError: () => isAuthSessionMissingError,
  isAuthWeakPasswordError: () => isAuthWeakPasswordError,
  lockInternals: () => internals,
  navigatorLock: () => navigatorLock,
  processLock: () => processLock
});
function shouldShowDeprecationWarning() {
  if (typeof window !== "undefined") {
    return false;
  }
  if (typeof process === "undefined") {
    return false;
  }
  const processVersion = process["version"];
  if (processVersion === void 0 || processVersion === null) {
    return false;
  }
  const versionMatch = processVersion.match(/^v(\d+)\./);
  if (!versionMatch) {
    return false;
  }
  const majorVersion = parseInt(versionMatch[1], 10);
  return majorVersion <= 18;
}
var createClient;
var init_module5 = __esm({
  "../node_modules/@supabase/supabase-js/dist/module/index.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_SupabaseClient();
    init_module4();
    init_wrapper();
    init_module();
    init_module2();
    init_SupabaseClient();
    createClient = /* @__PURE__ */ __name((supabaseUrl, supabaseKey, options) => {
      return new SupabaseClient(supabaseUrl, supabaseKey, options);
    }, "createClient");
    __name(shouldShowDeprecationWarning, "shouldShowDeprecationWarning");
    if (shouldShowDeprecationWarning()) {
      console.warn(`\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217`);
    }
  }
});

// admin-app-versions-api.js
async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS });
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let body2;
  try {
    body2 = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const token = ((request.headers.get("Authorization") || "").replace("Bearer ", "") || body2.token || "").trim();
  if (!token) return json({ error: "No token" }, 401);
  const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
  if (!session?.admin_users?.is_active) return json({ error: "Unauthorized" }, 403);
  const { action } = body2;
  if (action === "get_stats") {
    const [versionRows, activeUsers] = await Promise.all([
      supabase.from("app_version_stats").select("platform, build_number, app_version, device_count, last_seen, first_seen").order("last_seen", { ascending: false }).limit(100),
      // Active users last 7 days from user_data
      supabase.from("user_data").select("*", { count: "exact", head: true }).gte("updated_at", new Date(Date.now() - 7 * 864e5).toISOString())
    ]);
    const rows = versionRows.data || [];
    const byPlatform = {};
    let totalDevices = 0;
    for (const r2 of rows) {
      const p2 = r2.platform || "unknown";
      if (!byPlatform[p2]) byPlatform[p2] = [];
      byPlatform[p2].push(r2);
      totalDevices += r2.device_count || 0;
    }
    const latestBuilds = {};
    for (const [p2, items] of Object.entries(byPlatform)) {
      const sorted = items.slice().sort(
        (a2, b) => parseInt(b.build_number) - parseInt(a2.build_number) || new Date(b.last_seen) - new Date(a2.last_seen)
      );
      latestBuilds[p2] = sorted[0]?.build_number || "\u2014";
    }
    return json({
      success: true,
      rows,
      byPlatform,
      latestBuilds,
      totalDevices,
      activeUsers7d: activeUsers.count || 0
    });
  }
  return json({ error: "Unknown action" }, 400);
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
var CORS;
var init_admin_app_versions_api = __esm({
  "admin-app-versions-api.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    __name(onRequest, "onRequest");
    __name(json, "json");
  }
});

// ../node_modules/bcrypt-ts/dist/browser.js
var e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y, x, C;
var init_browser2 = __esm({
  "../node_modules/bcrypt-ts/dist/browser.js"() {
    init_functionsRoutes_0_6071133848472854();
    e = typeof scheduler == `object` && typeof scheduler.postTask == `function` ? scheduler.postTask.bind(scheduler) : setTimeout;
    t = [...`./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`];
    n = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, -1, -1, -1, -1, -1, -1, -1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, -1, -1, -1, -1, -1, -1, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, -1, -1, -1, -1, -1];
    r = [608135816, 2242054355, 320440878, 57701188, 2752067618, 698298832, 137296536, 3964562569, 1160258022, 953160567, 3193202383, 887688300, 3232508343, 3380367581, 1065670069, 3041331479, 2450970073, 2306472731];
    i = [3509652390, 2564797868, 805139163, 3491422135, 3101798381, 1780907670, 3128725573, 4046225305, 614570311, 3012652279, 134345442, 2240740374, 1667834072, 1901547113, 2757295779, 4103290238, 227898511, 1921955416, 1904987480, 2182433518, 2069144605, 3260701109, 2620446009, 720527379, 3318853667, 677414384, 3393288472, 3101374703, 2390351024, 1614419982, 1822297739, 2954791486, 3608508353, 3174124327, 2024746970, 1432378464, 3864339955, 2857741204, 1464375394, 1676153920, 1439316330, 715854006, 3033291828, 289532110, 2706671279, 2087905683, 3018724369, 1668267050, 732546397, 1947742710, 3462151702, 2609353502, 2950085171, 1814351708, 2050118529, 680887927, 999245976, 1800124847, 3300911131, 1713906067, 1641548236, 4213287313, 1216130144, 1575780402, 4018429277, 3917837745, 3693486850, 3949271944, 596196993, 3549867205, 258830323, 2213823033, 772490370, 2760122372, 1774776394, 2652871518, 566650946, 4142492826, 1728879713, 2882767088, 1783734482, 3629395816, 2517608232, 2874225571, 1861159788, 326777828, 3124490320, 2130389656, 2716951837, 967770486, 1724537150, 2185432712, 2364442137, 1164943284, 2105845187, 998989502, 3765401048, 2244026483, 1075463327, 1455516326, 1322494562, 910128902, 469688178, 1117454909, 936433444, 3490320968, 3675253459, 1240580251, 122909385, 2157517691, 634681816, 4142456567, 3825094682, 3061402683, 2540495037, 79693498, 3249098678, 1084186820, 1583128258, 426386531, 1761308591, 1047286709, 322548459, 995290223, 1845252383, 2603652396, 3431023940, 2942221577, 3202600964, 3727903485, 1712269319, 422464435, 3234572375, 1170764815, 3523960633, 3117677531, 1434042557, 442511882, 3600875718, 1076654713, 1738483198, 4213154764, 2393238008, 3677496056, 1014306527, 4251020053, 793779912, 2902807211, 842905082, 4246964064, 1395751752, 1040244610, 2656851899, 3396308128, 445077038, 3742853595, 3577915638, 679411651, 2892444358, 2354009459, 1767581616, 3150600392, 3791627101, 3102740896, 284835224, 4246832056, 1258075500, 768725851, 2589189241, 3069724005, 3532540348, 1274779536, 3789419226, 2764799539, 1660621633, 3471099624, 4011903706, 913787905, 3497959166, 737222580, 2514213453, 2928710040, 3937242737, 1804850592, 3499020752, 2949064160, 2386320175, 2390070455, 2415321851, 4061277028, 2290661394, 2416832540, 1336762016, 1754252060, 3520065937, 3014181293, 791618072, 3188594551, 3933548030, 2332172193, 3852520463, 3043980520, 413987798, 3465142937, 3030929376, 4245938359, 2093235073, 3534596313, 375366246, 2157278981, 2479649556, 555357303, 3870105701, 2008414854, 3344188149, 4221384143, 3956125452, 2067696032, 3594591187, 2921233993, 2428461, 544322398, 577241275, 1471733935, 610547355, 4027169054, 1432588573, 1507829418, 2025931657, 3646575487, 545086370, 48609733, 2200306550, 1653985193, 298326376, 1316178497, 3007786442, 2064951626, 458293330, 2589141269, 3591329599, 3164325604, 727753846, 2179363840, 146436021, 1461446943, 4069977195, 705550613, 3059967265, 3887724982, 4281599278, 3313849956, 1404054877, 2845806497, 146425753, 1854211946, 1266315497, 3048417604, 3681880366, 3289982499, 290971e4, 1235738493, 2632868024, 2414719590, 3970600049, 1771706367, 1449415276, 3266420449, 422970021, 1963543593, 2690192192, 3826793022, 1062508698, 1531092325, 1804592342, 2583117782, 2714934279, 4024971509, 1294809318, 4028980673, 1289560198, 2221992742, 1669523910, 35572830, 157838143, 1052438473, 1016535060, 1802137761, 1753167236, 1386275462, 3080475397, 2857371447, 1040679964, 2145300060, 2390574316, 1461121720, 2956646967, 4031777805, 4028374788, 33600511, 2920084762, 1018524850, 629373528, 3691585981, 3515945977, 2091462646, 2486323059, 586499841, 988145025, 935516892, 3367335476, 2599673255, 2839830854, 265290510, 3972581182, 2759138881, 3795373465, 1005194799, 847297441, 406762289, 1314163512, 1332590856, 1866599683, 4127851711, 750260880, 613907577, 1450815602, 3165620655, 3734664991, 3650291728, 3012275730, 3704569646, 1427272223, 778793252, 1343938022, 2676280711, 2052605720, 1946737175, 3164576444, 3914038668, 3967478842, 3682934266, 1661551462, 3294938066, 4011595847, 840292616, 3712170807, 616741398, 312560963, 711312465, 1351876610, 322626781, 1910503582, 271666773, 2175563734, 1594956187, 70604529, 3617834859, 1007753275, 1495573769, 4069517037, 2549218298, 2663038764, 504708206, 2263041392, 3941167025, 2249088522, 1514023603, 1998579484, 1312622330, 694541497, 2582060303, 2151582166, 1382467621, 776784248, 2618340202, 3323268794, 2497899128, 2784771155, 503983604, 4076293799, 907881277, 423175695, 432175456, 1378068232, 4145222326, 3954048622, 3938656102, 3820766613, 2793130115, 2977904593, 26017576, 3274890735, 3194772133, 1700274565, 1756076034, 4006520079, 3677328699, 720338349, 1533947780, 354530856, 688349552, 3973924725, 1637815568, 332179504, 3949051286, 53804574, 2852348879, 3044236432, 1282449977, 3583942155, 3416972820, 4006381244, 1617046695, 2628476075, 3002303598, 1686838959, 431878346, 2686675385, 1700445008, 1080580658, 1009431731, 832498133, 3223435511, 2605976345, 2271191193, 2516031870, 1648197032, 4164389018, 2548247927, 300782431, 375919233, 238389289, 3353747414, 2531188641, 2019080857, 1475708069, 455242339, 2609103871, 448939670, 3451063019, 1395535956, 2413381860, 1841049896, 1491858159, 885456874, 4264095073, 4001119347, 1565136089, 3898914787, 1108368660, 540939232, 1173283510, 2745871338, 3681308437, 4207628240, 3343053890, 4016749493, 1699691293, 1103962373, 3625875870, 2256883143, 3830138730, 1031889488, 3479347698, 1535977030, 4236805024, 3251091107, 2132092099, 1774941330, 1199868427, 1452454533, 157007616, 2904115357, 342012276, 595725824, 1480756522, 206960106, 497939518, 591360097, 863170706, 2375253569, 3596610801, 1814182875, 2094937945, 3421402208, 1082520231, 3463918190, 2785509508, 435703966, 3908032597, 1641649973, 2842273706, 3305899714, 1510255612, 2148256476, 2655287854, 3276092548, 4258621189, 236887753, 3681803219, 274041037, 1734335097, 3815195456, 3317970021, 1899903192, 1026095262, 4050517792, 356393447, 2410691914, 3873677099, 3682840055, 3913112168, 2491498743, 4132185628, 2489919796, 1091903735, 1979897079, 3170134830, 3567386728, 3557303409, 857797738, 1136121015, 1342202287, 507115054, 2535736646, 337727348, 3213592640, 1301675037, 2528481711, 1895095763, 1721773893, 3216771564, 62756741, 2142006736, 835421444, 2531993523, 1442658625, 3659876326, 2882144922, 676362277, 1392781812, 170690266, 3921047035, 1759253602, 3611846912, 1745797284, 664899054, 1329594018, 3901205900, 3045908486, 2062866102, 2865634940, 3543621612, 3464012697, 1080764994, 553557557, 3656615353, 3996768171, 991055499, 499776247, 1265440854, 648242737, 3940784050, 980351604, 3713745714, 1749149687, 3396870395, 4211799374, 3640570775, 1161844396, 3125318951, 1431517754, 545492359, 4268468663, 3499529547, 1437099964, 2702547544, 3433638243, 2581715763, 2787789398, 1060185593, 1593081372, 2418618748, 4260947970, 69676912, 2159744348, 86519011, 2512459080, 3838209314, 1220612927, 3339683548, 133810670, 1090789135, 1078426020, 1569222167, 845107691, 3583754449, 4072456591, 1091646820, 628848692, 1613405280, 3757631651, 526609435, 236106946, 48312990, 2942717905, 3402727701, 1797494240, 859738849, 992217954, 4005476642, 2243076622, 3870952857, 3732016268, 765654824, 3490871365, 2511836413, 1685915746, 3888969200, 1414112111, 2273134842, 3281911079, 4080962846, 172450625, 2569994100, 980381355, 4109958455, 2819808352, 2716589560, 2568741196, 3681446669, 3329971472, 1835478071, 660984891, 3704678404, 4045999559, 3422617507, 3040415634, 1762651403, 1719377915, 3470491036, 2693910283, 3642056355, 3138596744, 1364962596, 2073328063, 1983633131, 926494387, 3423689081, 2150032023, 4096667949, 1749200295, 3328846651, 309677260, 2016342300, 1779581495, 3079819751, 111262694, 1274766160, 443224088, 298511866, 1025883608, 3806446537, 1145181785, 168956806, 3641502830, 3584813610, 1689216846, 3666258015, 3200248200, 1692713982, 2646376535, 4042768518, 1618508792, 1610833997, 3523052358, 4130873264, 2001055236, 3610705100, 2202168115, 4028541809, 2961195399, 1006657119, 2006996926, 3186142756, 1430667929, 3210227297, 1314452623, 4074634658, 4101304120, 2273951170, 1399257539, 3367210612, 3027628629, 1190975929, 2062231137, 2333990788, 2221543033, 2438960610, 1181637006, 548689776, 2362791313, 3372408396, 3104550113, 3145860560, 296247880, 1970579870, 3078560182, 3769228297, 1714227617, 3291629107, 3898220290, 166772364, 1251581989, 493813264, 448347421, 195405023, 2709975567, 677966185, 3703036547, 1463355134, 2715995803, 1338867538, 1343315457, 2802222074, 2684532164, 233230375, 2599980071, 2000651841, 3277868038, 1638401717, 4028070440, 3237316320, 6314154, 819756386, 300326615, 590932579, 1405279636, 3267499572, 3150704214, 2428286686, 3959192993, 3461946742, 1862657033, 1266418056, 963775037, 2089974820, 2263052895, 1917689273, 448879540, 3550394620, 3981727096, 150775221, 3627908307, 1303187396, 508620638, 2975983352, 2726630617, 1817252668, 1876281319, 1457606340, 908771278, 3720792119, 3617206836, 2455994898, 1729034894, 1080033504, 976866871, 3556439503, 2881648439, 1522871579, 1555064734, 1336096578, 3548522304, 2579274686, 3574697629, 3205460757, 3593280638, 3338716283, 3079412587, 564236357, 2993598910, 1781952180, 1464380207, 3163844217, 3332601554, 1699332808, 1393555694, 1183702653, 3581086237, 1288719814, 691649499, 2847557200, 2895455976, 3193889540, 2717570544, 1781354906, 1676643554, 2592534050, 3230253752, 1126444790, 2770207658, 2633158820, 2210423226, 2615765581, 2414155088, 3127139286, 673620729, 2805611233, 1269405062, 4015350505, 3341807571, 4149409754, 1057255273, 2012875353, 2162469141, 2276492801, 2601117357, 993977747, 3918593370, 2654263191, 753973209, 36408145, 2530585658, 25011837, 3520020182, 2088578344, 530523599, 2918365339, 1524020338, 1518925132, 3760827505, 3759777254, 1202760957, 3985898139, 3906192525, 674977740, 4174734889, 2031300136, 2019492241, 3983892565, 4153806404, 3822280332, 352677332, 2297720250, 60907813, 90501309, 3286998549, 1016092578, 2535922412, 2839152426, 457141659, 509813237, 4120667899, 652014361, 1966332200, 2975202805, 55981186, 2327461051, 676427537, 3255491064, 2882294119, 3433927263, 1307055953, 942726286, 933058658, 2468411793, 3933900994, 4215176142, 1361170020, 2001714738, 2830558078, 3274259782, 1222529897, 1679025792, 2729314320, 3714953764, 1770335741, 151462246, 3013232138, 1682292957, 1483529935, 471910574, 1539241949, 458788160, 3436315007, 1807016891, 3718408830, 978976581, 1043663428, 3165965781, 1927990952, 4200891579, 2372276910, 3208408903, 3533431907, 1412390302, 2931980059, 4132332400, 1947078029, 3881505623, 4168226417, 2941484381, 1077988104, 1320477388, 886195818, 18198404, 3786409e3, 2509781533, 112762804, 3463356488, 1866414978, 891333506, 18488651, 661792760, 1628790961, 3885187036, 3141171499, 876946877, 2693282273, 1372485963, 791857591, 2686433993, 3759982718, 3167212022, 3472953795, 2716379847, 445679433, 3561995674, 3504004811, 3574258232, 54117162, 3331405415, 2381918588, 3769707343, 4154350007, 1140177722, 4074052095, 668550556, 3214352940, 367459370, 261225585, 2610173221, 4209349473, 3468074219, 3265815641, 314222801, 3066103646, 3808782860, 282218597, 3406013506, 3773591054, 379116347, 1285071038, 846784868, 2669647154, 3771962079, 3550491691, 2305946142, 453669953, 1268987020, 3317592352, 3279303384, 3744833421, 2610507566, 3859509063, 266596637, 3847019092, 517658769, 3462560207, 3443424879, 370717030, 4247526661, 2224018117, 4143653529, 4112773975, 2788324899, 2477274417, 1456262402, 2901442914, 1517677493, 1846949527, 2295493580, 3734397586, 2176403920, 1280348187, 1908823572, 3871786941, 846861322, 1172426758, 3287448474, 3383383037, 1655181056, 3139813346, 901632758, 1897031941, 2986607138, 3066810236, 3447102507, 1393639104, 373351379, 950779232, 625454576, 3124240540, 4148612726, 2007998917, 544563296, 2244738638, 2330496472, 2058025392, 1291430526, 424198748, 50039436, 29584100, 3605783033, 2429876329, 2791104160, 1057563949, 3255363231, 3075367218, 3463963227, 1469046755, 985887462];
    a = [1332899944, 1700884034, 1701343084, 1684370003, 1668446532, 1869963892];
    o = /* @__PURE__ */ __name((e2, n2) => {
      if (n2 <= 0 || n2 > e2.length) throw Error(`Illegal length: ${n2}`);
      let r2 = 0, i2, a2, o2 = [];
      for (; r2 < n2; ) {
        if (i2 = e2[r2++] & 255, o2.push(t[i2 >> 2 & 63]), i2 = (i2 & 3) << 4, r2 >= n2) {
          o2.push(t[i2 & 63]);
          break;
        }
        if (a2 = e2[r2++] & 255, i2 |= a2 >> 4 & 15, o2.push(t[i2 & 63]), i2 = (a2 & 15) << 2, r2 >= n2) {
          o2.push(t[i2 & 63]);
          break;
        }
        a2 = e2[r2++] & 255, i2 |= a2 >> 6 & 3, o2.push(t[i2 & 63]), o2.push(t[a2 & 63]);
      }
      return o2.join(``);
    }, "o");
    s = /* @__PURE__ */ __name((e2, t2) => {
      if (t2 <= 0) throw Error(`Illegal length: ${t2}`);
      let r2 = e2.length, i2 = 0, a2 = 0, o2, s2, c2, l2, u2, d2, f2 = [];
      for (; i2 < r2 - 1 && a2 < t2 && (d2 = e2.charCodeAt(i2++), o2 = d2 < n.length ? n[d2] : -1, d2 = e2.charCodeAt(i2++), s2 = d2 < n.length ? n[d2] : -1, !(o2 === -1 || s2 === -1 || (u2 = o2 << 2 >>> 0, u2 |= (s2 & 48) >> 4, f2.push(String.fromCharCode(u2)), ++a2 >= t2 || i2 >= r2) || (d2 = e2.charCodeAt(i2++), c2 = d2 < n.length ? n[d2] : -1, c2 === -1) || (u2 = (s2 & 15) << 4 >>> 0, u2 |= (c2 & 60) >> 2, f2.push(String.fromCharCode(u2)), ++a2 >= t2 || i2 >= r2))); ) d2 = e2.charCodeAt(i2++), l2 = d2 < n.length ? n[d2] : -1, u2 = (c2 & 3) << 6 >>> 0, u2 |= l2, f2.push(String.fromCharCode(u2)), ++a2;
      return f2.map((e3) => e3.charCodeAt(0));
    }, "s");
    c = /* @__PURE__ */ __name((e2, t2, n2, r2) => {
      let i2, a2 = e2[t2], o2 = e2[t2 + 1];
      return a2 ^= n2[0], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[1], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[2], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[3], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[4], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[5], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[6], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[7], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[8], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[9], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[10], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[11], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[12], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[13], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[14], i2 = r2[a2 >>> 24], i2 += r2[256 | a2 >> 16 & 255], i2 ^= r2[512 | a2 >> 8 & 255], i2 += r2[768 | a2 & 255], o2 ^= i2 ^ n2[15], i2 = r2[o2 >>> 24], i2 += r2[256 | o2 >> 16 & 255], i2 ^= r2[512 | o2 >> 8 & 255], i2 += r2[768 | o2 & 255], a2 ^= i2 ^ n2[16], e2[t2] = o2 ^ n2[17], e2[t2 + 1] = a2, e2;
    }, "c");
    l = /* @__PURE__ */ __name((e2, t2) => {
      let n2 = 0;
      for (let r2 = 0; r2 < 4; ++r2) n2 = n2 << 8 | e2[t2] & 255, t2 = (t2 + 1) % e2.length;
      return { key: n2, offp: t2 };
    }, "l");
    u = /* @__PURE__ */ __name((e2, t2, n2) => {
      let r2 = t2.length, i2 = n2.length, a2 = 0, o2 = new Int32Array([0, 0]), s2;
      for (let n3 = 0; n3 < r2; n3++) s2 = l(e2, a2), { offp: a2 } = s2, t2[n3] ^= s2.key;
      for (let e3 = 0; e3 < r2; e3 += 2) o2 = c(o2, 0, t2, n2), t2[e3] = o2[0], t2[e3 + 1] = o2[1];
      for (let e3 = 0; e3 < i2; e3 += 2) o2 = c(o2, 0, t2, n2), n2[e3] = o2[0], n2[e3 + 1] = o2[1];
    }, "u");
    d = /* @__PURE__ */ __name((e2, t2, n2, r2) => {
      let i2 = n2.length, a2 = r2.length, o2 = 0, s2 = new Int32Array([0, 0]), u2;
      for (let e3 = 0; e3 < i2; e3++) u2 = l(t2, o2), { offp: o2 } = u2, n2[e3] ^= u2.key;
      o2 = 0;
      for (let t3 = 0; t3 < i2; t3 += 2) u2 = l(e2, o2), { offp: o2 } = u2, s2[0] ^= u2.key, u2 = l(e2, o2), { offp: o2 } = u2, s2[1] ^= u2.key, s2 = c(s2, 0, n2, r2), n2[t3] = s2[0], n2[t3 + 1] = s2[1];
      for (let t3 = 0; t3 < a2; t3 += 2) u2 = l(e2, o2), { offp: o2 } = u2, s2[0] ^= u2.key, u2 = l(e2, o2), { offp: o2 } = u2, s2[1] ^= u2.key, s2 = c(s2, 0, n2, r2), r2[t3] = s2[0], r2[t3 + 1] = s2[1];
    }, "d");
    f = /* @__PURE__ */ __name((t2, n2, o2, s2, l2) => {
      let f2 = new Int32Array(a), p2 = f2.length;
      o2 = 1 << o2 >>> 0;
      let m2 = new Int32Array(r), h2 = new Int32Array(i);
      d(n2, t2, m2, h2);
      let g2 = 0, _2 = /* @__PURE__ */ __name(() => {
        if (l2 && l2(g2 / o2), g2 < o2) {
          let e2 = Date.now();
          for (; g2 < o2 && (g2 += 1, u(t2, m2, h2), u(n2, m2, h2), !(Date.now() - e2 > 100)); ) ;
        } else {
          for (let e3 = 0; e3 < 64; e3++) for (let e4 = 0; e4 < p2 >> 1; e4++) c(f2, e4 << 1, m2, h2);
          let e2 = [];
          for (let t3 = 0; t3 < p2; t3++) e2.push(f2[t3] >> 24 & 255), e2.push(f2[t3] >> 16 & 255), e2.push(f2[t3] >> 8 & 255), e2.push(f2[t3] & 255);
          return s2 ? e2 : Promise.resolve(e2);
        }
        if (!s2) return new Promise((t3) => e(() => {
          _2().then(t3);
        }));
      }, "_");
      if (!s2) return _2();
      let v2;
      do
        v2 = _2();
      while (!v2);
      return v2;
    }, "f");
    p = /* @__PURE__ */ __name((e2) => {
      try {
        let t2 = new Uint32Array(e2);
        return globalThis.crypto.getRandomValues(t2), [...t2];
      } catch {
        throw Error(`WebCryptoAPI / globalThis is not available`);
      }
    }, "p");
    m = /* @__PURE__ */ __name((...e2) => Error(`Illegal arguments: ${e2.map((e3) => typeof e3).join(`, `)}`), "m");
    h = /* @__PURE__ */ __name((e2 = 10) => {
      if (typeof e2 != `number`) throw m(e2);
      return e2 = e2 < 4 ? 4 : Math.min(31, e2), `$2b$${e2 < 10 ? `0` : ``}${e2}$${o(p(16), 16)}`;
    }, "h");
    g = /* @__PURE__ */ __name((t2 = 10) => new Promise((n2, r2) => e(() => {
      try {
        n2(h(t2));
      } catch (e2) {
        r2(e2);
      }
    })), "g");
    _ = /* @__PURE__ */ __name((e2) => {
      let t2 = 0, n2 = 0;
      for (let r2 = 0; r2 < e2.length; ++r2) t2 = e2.charCodeAt(r2), t2 < 128 ? n2 += 1 : t2 < 2048 ? n2 += 2 : (t2 & 64512) == 55296 && (e2.charCodeAt(r2 + 1) & 64512) == 56320 ? (r2++, n2 += 4) : n2 += 3;
      return n2;
    }, "_");
    v = /* @__PURE__ */ __name((e2) => {
      let t2 = 0, n2, r2, i2 = Array(_(e2));
      for (let a2 = 0, o2 = e2.length; a2 < o2; ++a2) n2 = e2.charCodeAt(a2), n2 < 128 ? i2[t2++] = n2 : n2 < 2048 ? (i2[t2++] = n2 >> 6 | 192, i2[t2++] = n2 & 63 | 128) : (n2 & 64512) == 55296 && ((r2 = e2.charCodeAt(a2 + 1)) & 64512) == 56320 ? (n2 = 65536 + ((n2 & 1023) << 10) + (r2 & 1023), ++a2, i2[t2++] = n2 >> 18 | 240, i2[t2++] = n2 >> 12 & 63 | 128, i2[t2++] = n2 >> 6 & 63 | 128, i2[t2++] = n2 & 63 | 128) : (i2[t2++] = n2 >> 12 | 224, i2[t2++] = n2 >> 6 & 63 | 128, i2[t2++] = n2 & 63 | 128);
      return i2;
    }, "v");
    y = /* @__PURE__ */ __name((e2, t2, n2, r2) => {
      if (typeof e2 != `string` || typeof t2 != `string`) {
        let e3 = Error(`Invalid content / salt: not a string`);
        if (!n2) return Promise.reject(e3);
        throw e3;
      }
      let i2, c2;
      if (t2.charAt(0) !== `$` || t2.charAt(1) !== `2`) {
        let e3 = Error(`Invalid salt version: ${t2.slice(0, 2)}`);
        if (!n2) return Promise.reject(e3);
        throw e3;
      }
      if (t2.charAt(2) === `$`) i2 = `\0`, c2 = 3;
      else {
        if (i2 = t2.charAt(2), i2 !== `a` && i2 !== `b` && i2 !== `y` || t2.charAt(3) !== `$`) {
          let e3 = Error(`Invalid salt revision: ${t2.slice(2, 4)}`);
          if (!n2) return Promise.reject(e3);
          throw e3;
        }
        c2 = 4;
      }
      let l2 = t2.slice(c2, c2 + 2), u2 = /\d\d/.test(l2) ? Number(l2) : null;
      if (u2 === null) {
        let e3 = Error(`Missing salt rounds`);
        if (!n2) return Promise.reject(e3);
        throw e3;
      }
      if (u2 < 4 || u2 > 31) {
        let e3 = Error(`Illegal number of rounds (4-31): ${u2}`);
        if (!n2) return Promise.reject(e3);
        throw e3;
      }
      let d2 = t2.slice(c2 + 3, c2 + 25);
      e2 += i2 >= `a` ? `\0` : ``;
      let p2 = v(e2), m2 = s(d2, 16);
      if (m2.length !== 16) {
        let e3 = Error(`Illegal salt: ${d2}`);
        if (!n2) return Promise.reject(e3);
        throw e3;
      }
      let h2 = /* @__PURE__ */ __name((e3) => `$2${i2 >= `a` ? i2 : ``}$${u2 < 10 ? `0` : ``}${u2}$${o(m2, 16)}${o(e3, a.length * 4 - 1)}`, "h");
      return n2 ? h2(f(p2, m2, u2, true, r2)) : f(p2, m2, u2, false, r2).then((e3) => h2(e3));
    }, "y");
    x = /* @__PURE__ */ __name(async (e2, t2, n2) => y(e2, typeof t2 == `number` ? await g(t2) : t2, false, n2), "x");
    C = /* @__PURE__ */ __name((t2, n2, r2) => new Promise((i2, a2) => {
      if (typeof t2 != `string` || typeof n2 != `string`) {
        e(() => a2(Error(`Illegal arguments: ${typeof t2}, ${typeof n2}`)));
        return;
      }
      if (n2.length !== 60) {
        e(() => i2(false));
        return;
      }
      x(t2, n2.slice(0, 29), r2).then((e2) => i2(e2 === n2)).catch((e2) => a2(e2));
    }), "C");
  }
});

// admin-auth.js
async function onRequest2(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  try {
    const { action, email, password, token, deviceFingerprint, page_slug, permission_type, turnstileToken, trustDevice, trustToken, deviceId, currentPassword, newPassword } = await request.json();
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    if (action === "heartbeat") {
      if (!token) {
        return jsonResponse({ success: false }, 401, corsHeaders);
      }
      const { data: session } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!session) {
        return jsonResponse({ success: false }, 401, corsHeaders);
      }
      await supabase.from("admin_users").update({
        last_heartbeat: (/* @__PURE__ */ new Date()).toISOString(),
        status: "online"
      }).eq("id", session.user_id);
      await supabase.from("admin_sessions").update({ last_activity: (/* @__PURE__ */ new Date()).toISOString() }).eq("token", token);
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (action === "verify") {
      if (!token) {
        return jsonResponse({ success: false, error: "No token provided" }, 401, corsHeaders);
      }
      const { data: session } = await supabase.from("admin_sessions").select("*, admin_users(*)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!session || !session.admin_users || !session.admin_users.is_active) {
        return jsonResponse({ success: false, error: "Invalid or expired session" }, 401, corsHeaders);
      }
      if (deviceFingerprint && session.admin_users.device_fingerprint) {
        if (session.admin_users.device_fingerprint !== deviceFingerprint) {
          await logAudit(supabase, session.user_id, session.admin_users.email, "device_mismatch", {
            expected: session.admin_users.device_fingerprint,
            received: deviceFingerprint
          }, clientIP, userAgent, null, null, null, "warning");
          return jsonResponse({
            success: false,
            error: "Device not authorized. Contact Super Admin to reset your device."
          }, 403, corsHeaders);
        }
      }
      await supabase.from("admin_users").update({
        last_heartbeat: (/* @__PURE__ */ new Date()).toISOString(),
        status: "online"
      }).eq("id", session.user_id);
      await supabase.from("admin_sessions").update({ last_activity: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", session.id);
      const { data: permissions2 } = await supabase.from("admin_permissions").select("page_slug, can_view, can_edit, can_delete").eq("user_id", session.user_id);
      const NO_TIMEOUT_EMAIL2 = "tafsirkurd@gmail.com";
      return jsonResponse({
        success: true,
        email: session.admin_users.email,
        role: session.admin_users.role,
        fullName: session.admin_users.full_name,
        permissions: permissions2 || [],
        totpEnabled: !!session.admin_users.totp_enabled,
        deviceLocked: !!session.admin_users.device_fingerprint,
        noTimeout: session.admin_users.email === NO_TIMEOUT_EMAIL2
      }, 200, corsHeaders);
    }
    if (action === "logout") {
      if (token) {
        const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(email)").eq("token", token).single();
        await supabase.from("admin_sessions").delete().eq("token", token);
        if (session) {
          await supabase.from("admin_users").update({
            status: "offline",
            last_heartbeat: null,
            device_fingerprint: null,
            device_user_agent: null,
            device_ip: null,
            device_locked_at: null
          }).eq("id", session.user_id);
          await logAudit(supabase, session.user_id, session.admin_users?.email, "logout", { device_unlocked: true }, clientIP, userAgent);
        }
      }
      return jsonResponse({ success: true, message: "Logged out successfully" }, 200, corsHeaders);
    }
    if (action === "check_permission") {
      if (!token) {
        return jsonResponse({ success: false }, 401, corsHeaders);
      }
      const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!session) {
        return jsonResponse({ success: false }, 401, corsHeaders);
      }
      if (session.admin_users.role === "super_admin") {
        return jsonResponse({ success: true, allowed: true }, 200, corsHeaders);
      }
      const { data: perm } = await supabase.from("admin_permissions").select("*").eq("user_id", session.user_id).eq("page_slug", page_slug).single();
      let allowed = false;
      if (perm) {
        if (permission_type === "view") allowed = perm.can_view;
        else if (permission_type === "edit") allowed = perm.can_edit;
        else if (permission_type === "delete") allowed = perm.can_delete;
      }
      return jsonResponse({ success: true, allowed }, 200, corsHeaders);
    }
    if (action === "verify-totp") {
      const pendingRaw = env.ADMIN_KV ? await env.ADMIN_KV.get(`totp_pending:${token}`, "json") : null;
      if (!pendingRaw) return jsonResponse({ error: "Session expired. Please log in again." }, 401, corsHeaders);
      const { data: user2 } = await supabase.from("admin_users").select("*").eq("id", pendingRaw.userId).single();
      if (!user2 || !user2.totp_enabled) return jsonResponse({ error: "Invalid session." }, 401, corsHeaders);
      let usedBackup = false;
      const codeInput = String(email).trim();
      if (user2.totp_backup_codes && Array.isArray(user2.totp_backup_codes)) {
        const codeHash = await sha256Hex(codeInput.toUpperCase());
        const idx = user2.totp_backup_codes.indexOf(codeHash);
        if (idx !== -1) {
          const remaining = user2.totp_backup_codes.filter((_2, i2) => i2 !== idx);
          await supabase.from("admin_users").update({ totp_backup_codes: remaining }).eq("id", user2.id);
          usedBackup = true;
        }
      }
      if (!usedBackup) {
        let valid = false;
        try {
          valid = await verifyTOTP(user2.totp_secret, codeInput);
        } catch (totpErr) {
          console.error("TOTP verify error:", totpErr);
          return jsonResponse({ error: "Invalid code. Try again." }, 401, corsHeaders);
        }
        if (!valid) {
          const failKey = `totp_fail:${token}`;
          const fails = env.ADMIN_KV ? (await env.ADMIN_KV.get(failKey, "json") || 0) + 1 : 1;
          if (fails >= 5) {
            if (env.ADMIN_KV) await env.ADMIN_KV.delete(`totp_pending:${token}`);
            await logAudit(supabase, user2.id, user2.email, "totp_brute_force", {}, clientIP, userAgent, null, null, null, "critical");
            await sendSecurityAlert(env, { type: "totp_brute_force", email: user2.email, ip: clientIP, detail: "5 wrong 2FA codes in a row" });
            return jsonResponse({ error: "Too many failed attempts. Please log in again.", expired: true }, 401, corsHeaders);
          }
          if (env.ADMIN_KV) await env.ADMIN_KV.put(failKey, JSON.stringify(fails), { expirationTtl: 300 });
          await logAudit(supabase, user2.id, user2.email, "totp_failed", { attempt: fails }, clientIP, userAgent, null, null, null, "warning");
          return jsonResponse({ error: "Invalid code. Try again. (" + (5 - fails) + " attempts left)" }, 401, corsHeaders);
        }
      }
      try {
        if (env.ADMIN_KV) await env.ADMIN_KV.delete(`totp_pending:${token}`);
        if (env.ADMIN_KV) await env.ADMIN_KV.delete(`ip_attempts:${clientIP}`);
        await supabase.from("admin_users").update({ failed_attempts: 0, last_login: (/* @__PURE__ */ new Date()).toISOString(), status: "online", last_heartbeat: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", user2.id);
        const sessionToken2 = generateSecureToken();
        const NO_TIMEOUT_EMAIL2 = "tafsirkurd@gmail.com";
        const expiresAt3 = user2.email === NO_TIMEOUT_EMAIL2 ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1e3) : new Date(Date.now() + 24 * 60 * 60 * 1e3);
        const { error: sessionErr } = await supabase.from("admin_sessions").insert({ user_id: user2.id, token: sessionToken2, ip_address: clientIP, user_agent: userAgent, device_fingerprint: deviceFingerprint, expires_at: expiresAt3.toISOString() });
        if (sessionErr) throw new Error(sessionErr.message);
        let newTrustToken = null;
        if (trustDevice) {
          const trustedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
          newTrustToken = generateSecureToken();
          try {
            await supabase.from("admin_trusted_devices").insert({
              user_id: user2.id,
              device_fingerprint: deviceFingerprint || newTrustToken,
              trust_token: newTrustToken,
              device_name: userAgent ? userAgent.substring(0, 120) : "Unknown device",
              ip_address: clientIP,
              expires_at: trustedExpiry.toISOString()
            });
          } catch (e2) {
            console.error("Trust device insert error:", e2);
            newTrustToken = null;
          }
        }
        await logAudit(supabase, user2.id, user2.email, "login_success_2fa", { usedBackup, trustedDevice: !!(trustDevice && deviceFingerprint) }, clientIP, userAgent, null, null, null, "info");
        await sendSecurityAlert(env, { type: "login_success", email: user2.email, ip: clientIP, detail: usedBackup ? "Signed in with backup code" : "Signed in with 2FA" });
        await cleanupOldSessions(supabase, user2.id);
        const { data: perms2 } = await supabase.from("admin_permissions").select("page_slug,can_view,can_edit,can_delete").eq("user_id", user2.id);
        return jsonResponse({ success: true, token: sessionToken2, expiresAt: expiresAt3.toISOString(), noTimeout: user2.email === NO_TIMEOUT_EMAIL2, user: { email: user2.email, fullName: user2.full_name, role: user2.role }, permissions: perms2 || [], trustToken: newTrustToken }, 200, corsHeaders);
      } catch (sessionCreationErr) {
        console.error("TOTP session creation error:", sessionCreationErr);
        return jsonResponse({ error: "Login error. Please try again." }, 500, corsHeaders);
      }
    }
    if (action === "setup-totp") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: u2 } = await supabase.from("admin_users").select("email,totp_enabled").eq("id", sess.user_id).single();
      if (!u2) return jsonResponse({ error: "User not found" }, 404, corsHeaders);
      if (u2.totp_enabled) return jsonResponse({ error: "2FA is already enabled." }, 400, corsHeaders);
      const secretBytes = crypto.getRandomValues(new Uint8Array(20));
      const secret = base32Encode(secretBytes);
      if (env.ADMIN_KV) await env.ADMIN_KV.put(`totp_setup:${sess.user_id}`, secret, { expirationTtl: 600 });
      const otpauthUrl = `otpauth://totp/TafsirKurd%20Admin:${encodeURIComponent(u2.email)}?secret=${secret}&issuer=TafsirKurd&algorithm=SHA1&digits=6&period=30`;
      return jsonResponse({ secret, otpauthUrl }, 200, corsHeaders);
    }
    if (action === "confirm-totp") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const secret = env.ADMIN_KV ? await env.ADMIN_KV.get(`totp_setup:${sess.user_id}`) : null;
      if (!secret) return jsonResponse({ error: "Setup session expired. Please start again." }, 400, corsHeaders);
      const valid = await verifyTOTP(secret, password);
      if (!valid) return jsonResponse({ error: "Invalid code. Check your authenticator and try again." }, 400, corsHeaders);
      const plainCodes = generateBackupCodes(8);
      const hashedCodes = await Promise.all(plainCodes.map((c2) => sha256Hex(c2)));
      await supabase.from("admin_users").update({ totp_secret: secret, totp_enabled: true, totp_backup_codes: hashedCodes }).eq("id", sess.user_id);
      if (env.ADMIN_KV) await env.ADMIN_KV.delete(`totp_setup:${sess.user_id}`);
      const { data: u2 } = await supabase.from("admin_users").select("email").eq("id", sess.user_id).single();
      await logAudit(supabase, sess.user_id, u2?.email, "totp_enabled", {}, clientIP, userAgent, null, null, null, "info");
      return jsonResponse({ success: true, backupCodes: plainCodes }, 200, corsHeaders);
    }
    if (action === "disable-totp") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: u2 } = await supabase.from("admin_users").select("*").eq("id", sess.user_id).single();
      if (!u2 || !u2.totp_enabled) return jsonResponse({ error: "2FA is not enabled." }, 400, corsHeaders);
      const valid = await verifyTOTP(u2.totp_secret, password);
      if (!valid) return jsonResponse({ error: "Invalid code." }, 400, corsHeaders);
      await supabase.from("admin_users").update({ totp_secret: null, totp_enabled: false, totp_backup_codes: null }).eq("id", sess.user_id);
      await logAudit(supabase, u2.id, u2.email, "totp_disabled", {}, clientIP, userAgent, null, null, null, "warning");
      await sendSecurityAlert(env, { type: "totp_disabled", email: u2.email, ip: clientIP });
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (action === "reset-totp") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: caller } = await supabase.from("admin_users").select("role,email").eq("id", sess.user_id).single();
      if (!caller || caller.role !== "super_admin") return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
      const targetId = email;
      await supabase.from("admin_users").update({ totp_secret: null, totp_enabled: false, totp_backup_codes: null }).eq("id", targetId);
      await logAudit(supabase, sess.user_id, caller.email, "totp_reset_by_admin", { target: targetId }, clientIP, userAgent, null, null, null, "warning");
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (action === "get-my-sessions") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sessions } = await supabase.from("admin_sessions").select("id,ip_address,user_agent,created_at,last_activity,expires_at,token").eq("user_id", sess.user_id).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).order("created_at", { ascending: false });
      const result = (sessions || []).map((s2) => ({ ...s2, isCurrent: s2.token === token, token: void 0 }));
      return jsonResponse({ sessions: result }, 200, corsHeaders);
    }
    if (action === "revoke-session") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id, admin_users(email)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { sessionId } = body;
      if (!sessionId) return jsonResponse({ error: "sessionId required" }, 400, corsHeaders);
      await supabase.from("admin_sessions").delete().eq("id", sessionId).eq("user_id", sess.user_id);
      await logAudit(supabase, sess.user_id, sess.admin_users?.email || null, "session_revoked", { sessionId }, clientIP, userAgent, null, null, null, "info");
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (action === "revoke-all-other-sessions") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id, admin_users(email)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      await supabase.from("admin_sessions").delete().eq("user_id", sess.user_id).neq("token", token);
      await logAudit(supabase, sess.user_id, sess.admin_users?.email || null, "all_other_sessions_revoked", {}, clientIP, userAgent, null, null, null, "warning");
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (action === "get-audit-logs") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: caller } = await supabase.from("admin_users").select("role").eq("id", sess.user_id).single();
      if (!caller || !["super_admin", "editor"].includes(caller.role)) return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
      const { data: logs } = await supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(2e3);
      return jsonResponse({ logs: logs || [] }, 200, corsHeaders);
    }
    if (action === "get-trusted-devices") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: devices } = await supabase.from("admin_trusted_devices").select("id,device_name,ip_address,created_at,expires_at,device_fingerprint").eq("user_id", sess.user_id).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).order("created_at", { ascending: false });
      return jsonResponse({ devices: devices || [] }, 200, corsHeaders);
    }
    if (action === "revoke-trusted-device") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id, admin_users(email)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      await supabase.from("admin_trusted_devices").delete().eq("id", deviceId).eq("user_id", sess.user_id);
      await logAudit(supabase, sess.user_id, sess.admin_users?.email || null, "trusted_device_revoked", { deviceId }, clientIP, userAgent, null, null, null, "info");
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (action === "change-password") {
      if (!token) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      const { data: sess } = await supabase.from("admin_sessions").select("user_id").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
      if (!sess) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      if (!currentPassword || !newPassword) return jsonResponse({ error: "Missing fields" }, 400, corsHeaders);
      if (newPassword.length < 8) return jsonResponse({ error: "Password must be at least 8 characters" }, 400, corsHeaders);
      const { data: u2 } = await supabase.from("admin_users").select("email,password_hash").eq("id", sess.user_id).single();
      if (!u2) return jsonResponse({ error: "User not found" }, 404, corsHeaders);
      const match2 = await C(currentPassword, u2.password_hash);
      if (!match2) return jsonResponse({ error: "Current password is incorrect" }, 401, corsHeaders);
      const newHash = await x(newPassword, 10);
      await supabase.from("admin_users").update({ password_hash: newHash }).eq("id", sess.user_id);
      await supabase.from("admin_sessions").delete().eq("user_id", sess.user_id).neq("token", token);
      await sendSecurityAlert(env, { type: "password_changed", email: u2.email, ip: clientIP, detail: "All other sessions have been logged out" });
      await logAudit(supabase, sess.user_id, u2.email, "password_changed", {}, clientIP, userAgent, null, null, null, "warning");
      return jsonResponse({ success: true }, 200, corsHeaders);
    }
    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400, corsHeaders);
    }
    const ipRateKey = `ip_attempts:${clientIP}`;
    const ipStored = env.ADMIN_KV ? await env.ADMIN_KV.get(ipRateKey, "json") : null;
    if (ipStored) {
      const now = Date.now();
      const recent = (ipStored.attempts || []).filter((t2) => now - t2 < 36e5);
      if (recent.length >= 10) {
        await logAudit(supabase, null, email, "ip_blocked", { ip: clientIP, attempts: recent.length }, clientIP, userAgent, null, null, null, "critical");
        await sendSecurityAlert(env, { type: "ip_blocked", email, ip: clientIP, detail: `${recent.length} attempts in the last hour` });
        return jsonResponse({ error: "Too many failed attempts from your location. Try again in 1 hour.", ipBlocked: true }, 429, corsHeaders);
      }
    }
    if (env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return jsonResponse({ error: "Human verification required." }, 400, corsHeaders);
      }
      const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: clientIP })
      });
      const tsData = await tsRes.json();
      if (!tsData.success) {
        return jsonResponse({ error: "Human verification failed. Please try again.", turnstileFailed: true }, 400, corsHeaders);
      }
    }
    const { data: user } = await supabase.from("admin_users").select("*").eq("email", email.toLowerCase()).single();
    if (!user) {
      await recordIPAttempt(env, clientIP);
      await logLoginAttempt(supabase, email, clientIP, false);
      await logAudit(supabase, null, email, "login_failed", { reason: "User not found" }, clientIP, userAgent);
      return jsonResponse({ error: "Invalid credentials" }, 401, corsHeaders);
    }
    if (!user.is_active) {
      await logLoginAttempt(supabase, email, clientIP, false);
      await logAudit(supabase, user.id, email, "login_failed", { reason: "Account disabled" }, clientIP, userAgent, null, null, deviceFingerprint, "warning");
      return jsonResponse({ error: "Account is disabled" }, 403, corsHeaders);
    }
    if (user.is_locked && user.locked_until && new Date(user.locked_until) > /* @__PURE__ */ new Date()) {
      const hoursRemaining = Math.ceil((new Date(user.locked_until) - /* @__PURE__ */ new Date()) / (1e3 * 60 * 60));
      return jsonResponse({
        error: `Account locked. Try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}.`,
        locked: true,
        lockedUntil: user.locked_until,
        attemptsRemaining: 0
      }, 429, corsHeaders);
    }
    if (user.is_locked && user.locked_until && new Date(user.locked_until) <= /* @__PURE__ */ new Date()) {
      await supabase.from("admin_users").update({
        is_locked: false,
        locked_until: null,
        failed_attempts: 0
      }).eq("id", user.id);
      user.is_locked = false;
      user.failed_attempts = 0;
    }
    if (!user.disable_device_lock && user.device_fingerprint && deviceFingerprint) {
      if (user.device_fingerprint !== deviceFingerprint) {
        await logAudit(supabase, user.id, email, "device_blocked", {
          reason: "Login attempted from unauthorized device",
          expected: user.device_fingerprint,
          received: deviceFingerprint
        }, clientIP, userAgent, null, null, deviceFingerprint, "critical");
        await sendSecurityAlert(env, { type: "device_blocked", email: user.email, ip: clientIP, detail: "Login attempted from unrecognized device" });
        return jsonResponse({
          error: "This account is locked to a different device. Contact Super Admin to reset.",
          deviceBlocked: true
        }, 403, corsHeaders);
      }
    }
    const passwordMatch = await C(password, user.password_hash);
    if (!passwordMatch) {
      await recordIPAttempt(env, clientIP);
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      const attemptsRemaining = 10 - newFailedAttempts;
      if (newFailedAttempts >= 10) {
        const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1e3);
        await supabase.from("admin_users").update({
          failed_attempts: newFailedAttempts,
          is_locked: true,
          locked_until: lockedUntil.toISOString()
        }).eq("id", user.id);
        await logLoginAttempt(supabase, email, clientIP, false);
        await logAudit(supabase, user.id, email, "account_locked", {
          reason: "10 failed login attempts",
          locked_until: lockedUntil.toISOString()
        }, clientIP, userAgent, null, null, deviceFingerprint, "critical");
        await sendSecurityAlert(env, { type: "account_locked", email: user.email, ip: clientIP, detail: "10 consecutive wrong passwords" });
        return jsonResponse({
          error: "Account locked due to multiple failed attempts. Try again in 24 hours.",
          locked: true,
          lockedUntil: lockedUntil.toISOString(),
          attemptsRemaining: 0
        }, 429, corsHeaders);
      }
      await supabase.from("admin_users").update({ failed_attempts: newFailedAttempts }).eq("id", user.id);
      await logLoginAttempt(supabase, email, clientIP, false);
      await logAudit(supabase, user.id, email, "login_failed", {
        reason: "Invalid password",
        attempts_remaining: attemptsRemaining
      }, clientIP, userAgent, null, null, deviceFingerprint, "warning");
      return jsonResponse({
        error: "Invalid credentials",
        attemptsRemaining
      }, 401, corsHeaders);
    }
    if (!user.disable_device_lock && !user.device_fingerprint && deviceFingerprint) {
      await supabase.from("admin_users").update({
        device_fingerprint: deviceFingerprint,
        device_user_agent: userAgent,
        device_ip: clientIP,
        device_locked_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", user.id);
      await logAudit(supabase, user.id, email, "device_locked", {
        fingerprint: deviceFingerprint,
        user_agent: userAgent,
        ip: clientIP
      }, clientIP, userAgent, null, null, deviceFingerprint, "info");
    } else if (user.disable_device_lock) {
      await logAudit(supabase, user.id, email, "login_device_lock_disabled", {
        note: "Device locking disabled for this user",
        user_agent: userAgent,
        ip: clientIP
      }, clientIP, userAgent, null, null, deviceFingerprint, "info");
    }
    if (user.totp_enabled) {
      let skipTOTP = false;
      if (trustToken) {
        const { data: trusted } = await supabase.from("admin_trusted_devices").select("id").eq("user_id", user.id).eq("trust_token", trustToken).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
        if (trusted) skipTOTP = true;
      }
      if (!skipTOTP && deviceFingerprint) {
        const { data: trusted } = await supabase.from("admin_trusted_devices").select("id").eq("user_id", user.id).eq("device_fingerprint", deviceFingerprint).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
        if (trusted) skipTOTP = true;
      }
      if (!skipTOTP) {
        const tempToken = generateSecureToken();
        if (env.ADMIN_KV) {
          await env.ADMIN_KV.put(
            `totp_pending:${tempToken}`,
            JSON.stringify({ userId: user.id, email: user.email }),
            { expirationTtl: 300 }
            // 5 minutes
          );
        }
        return jsonResponse({ requiresTOTP: true, tempToken }, 200, corsHeaders);
      }
    }
    if (env.ADMIN_KV) await env.ADMIN_KV.delete(`ip_attempts:${clientIP}`);
    await supabase.from("admin_users").update({
      failed_attempts: 0,
      last_login: (/* @__PURE__ */ new Date()).toISOString(),
      last_heartbeat: (/* @__PURE__ */ new Date()).toISOString(),
      status: "online"
    }).eq("id", user.id);
    const sessionToken = generateSecureToken();
    const NO_TIMEOUT_EMAIL = "tafsirkurd@gmail.com";
    const expiresAt2 = email === NO_TIMEOUT_EMAIL ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1e3) : new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await supabase.from("admin_sessions").insert({
      user_id: user.id,
      token: sessionToken,
      ip_address: clientIP,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
      expires_at: expiresAt2.toISOString()
    });
    await logLoginAttempt(supabase, email, clientIP, true);
    const isNewDevice = !user.device_fingerprint && deviceFingerprint;
    await sendSecurityAlert(env, { type: isNewDevice ? "new_device" : "login_success", email, ip: clientIP, detail: isNewDevice ? "First login from this device" : "" });
    await logAudit(supabase, user.id, email, "login_success", {
      device_fingerprint: deviceFingerprint
    }, clientIP, userAgent, null, null, deviceFingerprint, "info");
    await cleanupOldSessions(supabase, user.id);
    const { data: permissions } = await supabase.from("admin_permissions").select("page_slug, can_view, can_edit, can_delete").eq("user_id", user.id);
    return jsonResponse({
      success: true,
      token: sessionToken,
      expiresAt: expiresAt2.toISOString(),
      noTimeout: email === NO_TIMEOUT_EMAIL,
      user: {
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      permissions: permissions || [],
      deviceLocked: !!user.device_fingerprint
    }, 200, corsHeaders);
  } catch (error) {
    console.error("Admin auth error:", error);
    return jsonResponse({ error: "Internal server error" }, 500, corsHeaders);
  }
}
function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
function generateSecureToken() {
  const tokenArray = new Uint8Array(32);
  crypto.getRandomValues(tokenArray);
  return Array.from(tokenArray).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function logAudit(supabase, userId, email, action, details, ipAddress, userAgent, pageSlug = null, resourceType = null, deviceFingerprint = null, severity = "info") {
  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: userId,
      email,
      action,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
      page_slug: pageSlug,
      resource_type: resourceType,
      device_fingerprint: deviceFingerprint,
      severity
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
async function logLoginAttempt(supabase, email, ipAddress, success) {
  try {
    await supabase.from("admin_login_attempts").insert({
      email,
      ip_address: ipAddress,
      success
    });
  } catch (error) {
    console.error("Login attempt log error:", error);
  }
}
async function sendSecurityAlert(env, { type, email, ip, detail = "" }) {
  if (!env.RESEND_API_KEY) return;
  const ALERT_TO = "tefsirkurd@gmail.com";
  const icons = {
    login_success: "\u2705",
    login_failed: "\u26A0\uFE0F",
    account_locked: "\u{1F512}",
    device_blocked: "\u{1F6AB}",
    ip_blocked: "\u{1F6D1}",
    totp_failed: "\u{1F510}",
    totp_brute_force: "\u{1F6A8}",
    totp_disabled: "\u26A0\uFE0F",
    new_device: "\u{1F4F1}",
    password_changed: "\u{1F511}"
  };
  const labels = {
    login_success: "Successful Login",
    login_failed: "Failed Login Attempt",
    account_locked: "Account Locked",
    device_blocked: "Blocked: Unrecognized Device",
    ip_blocked: "Blocked: Too Many Attempts (IP)",
    totp_failed: "2FA Code Failed",
    totp_brute_force: "2FA Brute Force Detected",
    totp_disabled: "2FA Disabled",
    new_device: "New Device Logged In",
    password_changed: "Password Changed"
  };
  const icon = icons[type] || "\u{1F514}";
  const label = labels[type] || type;
  const time = (/* @__PURE__ */ new Date()).toLocaleString("en-GB", { timeZone: "Asia/Baghdad", hour12: false });
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <div style="background:#0f172a;padding:20px 24px;color:#fff">
        <div style="font-size:22px;margin-bottom:4px">${icon} ${label}</div>
        <div style="font-size:12px;opacity:.6">TafsirKurd Admin Security Alert</div>
      </div>
      <div style="padding:20px 24px;background:#fff">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:80px">Account</td><td style="padding:6px 0;font-weight:600">${email || "\u2014"}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">IP</td><td style="padding:6px 0">${ip || "\u2014"}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Time</td><td style="padding:6px 0">${time} (Baghdad)</td></tr>
          ${detail ? `<tr><td style="padding:6px 0;color:#6b7280">Detail</td><td style="padding:6px 0">${detail}</td></tr>` : ""}
        </table>
        <div style="margin-top:16px;font-size:12px;color:#9ca3af">If this was not you, change your password immediately.</div>
      </div>
    </div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "TafsirKurd Security <security@tafsirkurd.com>", to: ALERT_TO, subject: `${icon} ${label} \u2014 TafsirKurd Admin`, html })
    });
  } catch (e2) {
    console.error("Alert email failed:", e2);
  }
}
async function recordIPAttempt(env, ip) {
  if (!env.ADMIN_KV) return;
  const key = `ip_attempts:${ip}`;
  const stored = await env.ADMIN_KV.get(key, "json") || { attempts: [] };
  const now = Date.now();
  const recent = (stored.attempts || []).filter((t2) => now - t2 < 36e5);
  recent.push(now);
  await env.ADMIN_KV.put(key, JSON.stringify({ attempts: recent }), { expirationTtl: 3600 });
}
function base32Decode(input) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  input = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of input) {
    const idx = alpha.indexOf(ch);
    if (idx < 0) continue;
    value = value << 5 | idx;
    bits += 5;
    if (bits >= 8) {
      out.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
function base32Encode(bytes) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = value << 8 | b;
    bits += 8;
    while (bits >= 5) {
      out += alpha[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alpha[value << 5 - bits & 31];
  return out;
}
async function verifyTOTP(secret, token, window2 = 1) {
  const key = base32Decode(secret);
  const ck = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 3e4);
  for (let i2 = -window2; i2 <= window2; i2++) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setUint32(4, now + i2, false);
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", ck, buf));
    const off = sig[19] & 15;
    const code = ((sig[off] & 127) << 24 | sig[off + 1] << 16 | sig[off + 2] << 8 | sig[off + 3]) % 1e6;
    if (String(code).padStart(6, "0") === String(token).trim()) return true;
  }
  return false;
}
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i2 = 0; i2 < count; i2++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    codes.push(Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase());
  }
  return codes;
}
async function cleanupOldSessions(supabase, userId) {
  try {
    const { data: sessions } = await supabase.from("admin_sessions").select("id").eq("user_id", userId).order("last_activity", { ascending: false });
    if (sessions && sessions.length > 5) {
      const sessionIdsToDelete = sessions.slice(5).map((s2) => s2.id);
      await supabase.from("admin_sessions").delete().in("id", sessionIdsToDelete);
    }
  } catch (error) {
    console.error("Session cleanup error:", error);
  }
}
var init_admin_auth = __esm({
  "admin-auth.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    init_browser2();
    __name(onRequest2, "onRequest");
    __name(jsonResponse, "jsonResponse");
    __name(generateSecureToken, "generateSecureToken");
    __name(logAudit, "logAudit");
    __name(logLoginAttempt, "logLoginAttempt");
    __name(sendSecurityAlert, "sendSecurityAlert");
    __name(recordIPAttempt, "recordIPAttempt");
    __name(base32Decode, "base32Decode");
    __name(base32Encode, "base32Encode");
    __name(verifyTOTP, "verifyTOTP");
    __name(sha256Hex, "sha256Hex");
    __name(generateBackupCodes, "generateBackupCodes");
    __name(cleanupOldSessions, "cleanupOldSessions");
  }
});

// admin-auth-OLD-BACKUP.js
async function onRequest3() {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}
var init_admin_auth_OLD_BACKUP = __esm({
  "admin-auth-OLD-BACKUP.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest3, "onRequest");
  }
});

// admin-books.js
async function onRequest4(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server config error" }), { status: 500, headers: corsHeaders });
  }
  let body2;
  try {
    body2 = await request.json();
  } catch (e2) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }
  const { action, token } = body2;
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  const sessionRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&select=id,expires_at`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!sessionRes.ok) return new Response(JSON.stringify({ error: "Auth check failed" }), { status: 401, headers: corsHeaders });
  const sessions = await sessionRes.json();
  if (!sessions.length || new Date(sessions[0].expires_at) < /* @__PURE__ */ new Date()) {
    return new Response(JSON.stringify({ error: "Session expired" }), { status: 401, headers: corsHeaders });
  }
  const base = `${supabaseUrl}/rest/v1/gencine_books`;
  const hdrs = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
  try {
    if (action === "list") {
      const r2 = await fetch(`${base}?select=*&order=sort_order.desc`, { headers: hdrs });
      const data = await r2.json();
      return new Response(JSON.stringify({ data }), { headers: corsHeaders });
    }
    if (action === "insert") {
      const { payload } = body2;
      const r2 = await fetch(base, { method: "POST", headers: hdrs, body: JSON.stringify(payload) });
      const data = await r2.json();
      if (!r2.ok) return new Response(JSON.stringify({ error: data }), { status: r2.status, headers: corsHeaders });
      return new Response(JSON.stringify({ data }), { headers: corsHeaders });
    }
    if (action === "update") {
      const { id, payload } = body2;
      if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });
      const r2 = await fetch(`${base}?id=eq.${id}`, { method: "PATCH", headers: hdrs, body: JSON.stringify(payload) });
      const data = await r2.json();
      if (!r2.ok) return new Response(JSON.stringify({ error: data }), { status: r2.status, headers: corsHeaders });
      return new Response(JSON.stringify({ data }), { headers: corsHeaders });
    }
    if (action === "delete") {
      const { id } = body2;
      if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });
      const r2 = await fetch(`${base}?id=eq.${id}`, { method: "DELETE", headers: { ...hdrs, Prefer: "return=minimal" } });
      if (!r2.ok) {
        const e2 = await r2.text();
        return new Response(JSON.stringify({ error: e2 }), { status: r2.status, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e2) {
    return new Response(JSON.stringify({ error: e2.message }), { status: 500, headers: corsHeaders });
  }
}
var init_admin_books = __esm({
  "admin-books.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest4, "onRequest");
  }
});

// admin-bump-version.js
async function onRequest5(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return resp(null, 200);
  if (request.method !== "POST") return resp({ error: "POST only" }, 405);
  let body2;
  try {
    body2 = await request.json();
  } catch (e2) {
    return resp({ error: "Invalid JSON" }, 400);
  }
  const token = ((request.headers.get("Authorization") || "").replace("Bearer ", "") || "").trim();
  if (!token) return resp({ error: "No token" }, 401);
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
  if (!session || !session.admin_users || !session.admin_users.is_active)
    return resp({ error: "Unauthorized" }, 403);
  if (!env.GITHUB_TOKEN)
    return resp({ error: "GITHUB_TOKEN not set" }, 500);
  const ghH = {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": "Bearer " + env.GITHUB_TOKEN,
    "User-Agent": "TafsirKurd-Admin/1.0",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const fileUrl = "https://api.github.com/repos/" + REPO + "/contents/" + REPO_FILE;
  let fileRes;
  try {
    fileRes = await fetch(fileUrl, { headers: ghH });
  } catch (e2) {
    return resp({ error: "GitHub fetch error: " + String(e2) }, 502);
  }
  if (!fileRes.ok) {
    const detail = await fileRes.text().catch(function() {
      return "";
    });
    return resp({ error: "GitHub " + fileRes.status, detail }, 502);
  }
  let fileData;
  try {
    fileData = await fileRes.json();
  } catch (e2) {
    return resp({ error: "GitHub JSON parse error" }, 502);
  }
  if (!fileData || !fileData.content)
    return resp({ error: "No content in GitHub response" }, 502);
  const raw = fileData.content.replace(/\n/g, "");
  let content;
  try {
    const bytes = Uint8Array.from(atob(raw), function(c2) {
      return c2.charCodeAt(0);
    });
    content = new TextDecoder().decode(bytes);
  } catch (e2) {
    return resp({ error: "base64 decode error: " + String(e2) }, 500);
  }
  const buildMatch = content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+)/);
  const versionMatch = content.match(/MARKETING_VERSION\s*=\s*([\d.]+)/);
  const curBuild = buildMatch ? parseInt(buildMatch[1]) : 0;
  const curVersion = versionMatch ? versionMatch[1] : "1.0.0";
  if (body2.action === "read")
    return resp({ buildNumber: curBuild, marketingVersion: curVersion });
  if (body2.action !== "commit")
    return resp({ error: "Unknown action" }, 400);
  const newBuild = String(body2.buildNumber || "").trim();
  const newVersion = String(body2.marketingVersion || "").trim();
  if (!newBuild || !/^\d+$/.test(newBuild))
    return resp({ error: "Build number must be a positive integer" }, 400);
  if (!newVersion || !/^\d+\.\d+(\.\d+)?$/.test(newVersion))
    return resp({ error: "Marketing version must be X.Y or X.Y.Z" }, 400);
  if (parseInt(newBuild) <= curBuild)
    return resp({ error: "Build number must be > " + curBuild }, 400);
  const updated = content.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+/g, "CURRENT_PROJECT_VERSION = " + newBuild).replace(/MARKETING_VERSION\s*=\s*[\d.]+/g, "MARKETING_VERSION = " + newVersion);
  let encoded;
  try {
    const enc = new TextEncoder().encode(updated);
    let bin = "";
    for (let i2 = 0; i2 < enc.length; i2++) bin += String.fromCharCode(enc[i2]);
    encoded = btoa(bin);
  } catch (e2) {
    return resp({ error: "base64 encode error: " + String(e2) }, 500);
  }
  const msg = "bump(ios): " + curVersion + " -> " + newVersion + " build " + curBuild + " -> " + newBuild;
  let putRes;
  try {
    putRes = await fetch(fileUrl, {
      method: "PUT",
      headers: Object.assign({}, ghH, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        message: msg,
        content: encoded,
        sha: fileData.sha,
        branch: "main",
        committer: { name: "TafsirKurd Admin", email: "admin@tafsirkurd.com" }
      })
    });
  } catch (e2) {
    return resp({ error: "GitHub write error: " + String(e2) }, 502);
  }
  if (!putRes.ok) {
    const detail = await putRes.text().catch(function() {
      return "";
    });
    return resp({ error: "GitHub write " + putRes.status, detail }, 502);
  }
  let putData;
  try {
    putData = await putRes.json();
  } catch (e2) {
    putData = {};
  }
  return resp({
    success: true,
    sha: putData.commit && putData.commit.sha ? putData.commit.sha.slice(0, 7) : "?",
    message: msg,
    buildNumber: parseInt(newBuild),
    marketingVersion: newVersion
  });
}
function resp(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: CORS2 });
}
var CORS2, REPO, REPO_FILE;
var init_admin_bump_version = __esm({
  "admin-bump-version.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS2 = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    REPO = "tafsirkurd/TafsirKurd";
    REPO_FILE = "ios/App/App.xcodeproj/project.pbxproj";
    __name(onRequest5, "onRequest");
    __name(resp, "resp");
  }
});

// admin-db-health-api.js
async function onRequest6(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS3 });
  if (request.method !== "POST") return json2({ error: "POST only" }, 405);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let body2;
  try {
    body2 = await request.json();
  } catch {
    return json2({ error: "Invalid JSON" }, 400);
  }
  const token = ((request.headers.get("Authorization") || "").replace("Bearer ", "") || body2.token || "").trim();
  if (!token) return json2({ error: "No token" }, 401);
  const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
  if (!session?.admin_users?.is_active) return json2({ error: "Unauthorized" }, 403);
  const { action } = body2;
  if (action === "get_stats") {
    const counts = await Promise.all(
      KNOWN_TABLES.map(
        (name) => supabase.from(name).select("*", { count: "exact", head: true }).then((r2) => ({ name, count: r2.count || 0, error: r2.error?.message || null })).catch((e2) => ({ name, count: null, error: e2.message }))
      )
    );
    const ago24h = new Date(Date.now() - 864e5).toISOString();
    const recentWrites = await Promise.all([
      supabase.from("user_data").select("*", { count: "exact", head: true }).gte("updated_at", ago24h).then((r2) => ({ name: "user_data", recent: r2.count || 0 })),
      supabase.from("admin_notifications").select("*", { count: "exact", head: true }).gte("created_at", ago24h).then((r2) => ({ name: "admin_notifications", recent: r2.count || 0 })),
      supabase.from("admin_activity_log").select("*", { count: "exact", head: true }).gte("created_at", ago24h).then((r2) => ({ name: "admin_activity_log", recent: r2.count || 0 })),
      supabase.from("push_tokens").select("*", { count: "exact", head: true }).gte("created_at", ago24h).then((r2) => ({ name: "push_tokens", recent: r2.count || 0 })).catch(() => ({ name: "push_tokens", recent: null })),
      supabase.from("kurdish_translations").select("*", { count: "exact", head: true }).gte("created_at", ago24h).then((r2) => ({ name: "kurdish_translations", recent: r2.count || 0 })).catch(() => ({ name: "kurdish_translations", recent: null })),
      supabase.from("i18n_cache_health").select("*", { count: "exact", head: true }).gte("created_at", ago24h).then((r2) => ({ name: "i18n_cache_health", recent: r2.count || 0 })).catch(() => ({ name: "i18n_cache_health", recent: null }))
    ]);
    const recentMap = {};
    recentWrites.forEach((r2) => {
      recentMap[r2.name] = r2.recent;
    });
    const tables = counts.map((c2) => ({ ...c2, recent24h: recentMap[c2.name] ?? null }));
    const totalRows = tables.reduce((s2, r2) => s2 + (r2.count || 0), 0);
    return json2({ success: true, tables, totalRows, checkedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }
  if (action === "get_recent_activity") {
    const { data, error } = await supabase.from("admin_activity_log").select("admin_name, action_type, description, created_at").order("created_at", { ascending: false }).limit(20);
    if (error) return json2({ error: error.message }, 500);
    return json2({ success: true, activity: data || [] });
  }
  return json2({ error: "Unknown action" }, 400);
}
function json2(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS3 });
}
var CORS3, KNOWN_TABLES;
var init_admin_db_health_api = __esm({
  "admin-db-health-api.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS3 = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    KNOWN_TABLES = [
      "user_data",
      "push_tokens",
      "admin_notifications",
      "admin_users",
      "admin_sessions",
      "admin_activity_log",
      "kurdish_translations",
      "deleted_translation_keys",
      "site_settings",
      "islamvoice_episodes",
      "gencine_hadiths",
      "gencine_duas",
      "gencine_adhkar",
      "gencine_books",
      "gencine_sections",
      "prayer_cache",
      "i18n_cache_health"
    ];
    __name(onRequest6, "onRequest");
    __name(json2, "json");
  }
});

// admin-errors-api.js
async function onRequest7(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS4 });
  if (request.method !== "POST") return json3({ error: "POST only" }, 405);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let body2;
  try {
    body2 = await request.json();
  } catch {
    return json3({ error: "Invalid JSON" }, 400);
  }
  const token = ((request.headers.get("Authorization") || "").replace("Bearer ", "") || body2.token || "").trim();
  if (!token) return json3({ error: "No token" }, 401);
  const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
  if (!session?.admin_users?.is_active) return json3({ error: "Unauthorized" }, 403);
  const role = session.admin_users.role;
  const { action } = body2;
  if (action === "list") {
    let q = supabase.from("app_error_logs").select("*").order("created_at", { ascending: false }).limit(body2.limit || 100);
    if (body2.platform) q = q.eq("platform", body2.platform);
    if (body2.error_type) q = q.eq("error_type", body2.error_type);
    if (body2.since) q = q.gte("created_at", body2.since);
    const { data, error } = await q;
    if (error) return json3({ error: error.message }, 500);
    return json3({ success: true, errors: data || [] });
  }
  if (action === "get_stats") {
    const ago7d = new Date(Date.now() - 7 * 864e5).toISOString();
    const ago24h = new Date(Date.now() - 864e5).toISOString();
    const ago30d = new Date(Date.now() - 30 * 864e5).toISOString();
    const [r7d, r24h, r30d, byType, byPlatform] = await Promise.all([
      supabase.from("app_error_logs").select("*", { count: "exact", head: true }).gte("created_at", ago7d),
      supabase.from("app_error_logs").select("*", { count: "exact", head: true }).gte("created_at", ago24h),
      supabase.from("app_error_logs").select("error_type, platform, created_at").gte("created_at", ago30d).limit(5e3),
      supabase.from("app_error_logs").select("error_type").gte("created_at", ago7d).limit(2e3),
      supabase.from("app_error_logs").select("platform").gte("created_at", ago7d).limit(2e3)
    ]);
    const dayMap = {};
    for (let d2 = 0; d2 < 30; d2++) {
      const dt = new Date(Date.now() - (29 - d2) * 864e5);
      dayMap[dt.toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" })] = 0;
    }
    for (const r2 of r30d.data || []) {
      const k = new Date(r2.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
      if (k in dayMap) dayMap[k]++;
    }
    const dailyData = Object.keys(dayMap).sort().map((date) => ({ date, count: dayMap[date] }));
    const typeMap = {};
    for (const r2 of byType.data || [])
      typeMap[r2.error_type] = (typeMap[r2.error_type] || 0) + 1;
    const platMap = {};
    for (const r2 of byPlatform.data || [])
      platMap[r2.platform || "unknown"] = (platMap[r2.platform || "unknown"] || 0) + 1;
    return json3({
      success: true,
      counts: { last24h: r24h.count || 0, last7d: r7d.count || 0 },
      dailyData,
      byType: Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a2, b) => b.count - a2.count),
      byPlatform: Object.entries(platMap).map(([platform, count]) => ({ platform, count }))
    });
  }
  if (action === "resolve") {
    const ids = Array.isArray(body2.ids) ? body2.ids : body2.id ? [body2.id] : [];
    if (!ids.length) return json3({ error: "No ids provided" }, 400);
    const { error } = await supabase.from("app_error_logs").delete().in("id", ids);
    if (error) return json3({ error: error.message }, 500);
    return json3({ success: true });
  }
  if (action === "clear_old") {
    if (role !== "super_admin") return json3({ error: "super_admin required" }, 403);
    const cutoff = body2.before || new Date(Date.now() - 30 * 864e5).toISOString();
    const { error } = await supabase.from("app_error_logs").delete().lt("created_at", cutoff);
    if (error) return json3({ error: error.message }, 500);
    return json3({ success: true });
  }
  return json3({ error: "Unknown action" }, 400);
}
function json3(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS4 });
}
var CORS4;
var init_admin_errors_api = __esm({
  "admin-errors-api.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS4 = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    __name(onRequest7, "onRequest");
    __name(json3, "json");
  }
});

// admin-github-commits.js
async function onRequest8(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS5 });
  if (request.method !== "POST") return json4({ error: "POST only" }, 405);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let body2;
  try {
    body2 = await request.json();
  } catch {
    return json4({ error: "Invalid JSON" }, 400);
  }
  const token = ((request.headers.get("Authorization") || "").replace("Bearer ", "") || body2.token || "").trim();
  if (!token) return json4({ error: "No token" }, 401);
  const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
  if (!session?.admin_users?.is_active) return json4({ error: "Unauthorized" }, 403);
  if (!env.GITHUB_TOKEN) return json4({ error: "GITHUB_TOKEN not configured" }, 500);
  const perPage = Math.min(parseInt(body2.per_page) || 20, 50);
  const ref = "main";
  const ghUrl = `https://api.github.com/repos/tafsirkurd/TafsirKurd/commits?per_page=${perPage}&sha=${ref}`;
  try {
    const ghRes = await fetch(ghUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "TafsirKurd-Admin/1.0",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!ghRes.ok) {
      const err = await ghRes.text().catch(() => "");
      return json4({ error: "GitHub API error", status: ghRes.status, detail: err }, 502);
    }
    const commits = await ghRes.json();
    return json4({ success: true, commits });
  } catch (e2) {
    return json4({ error: "Fetch failed", detail: String(e2) }, 502);
  }
}
function json4(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS5 });
}
var CORS5;
var init_admin_github_commits = __esm({
  "admin-github-commits.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS5 = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    __name(onRequest8, "onRequest");
    __name(json4, "json");
  }
});

// admin-management.js
async function onRequest9(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  try {
    const body2 = await request.json();
    const { action, token, targetUserId } = body2;
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    if (!token) {
      return jsonResponse2({ error: "No token provided" }, 401, corsHeaders);
    }
    const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, email, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
    if (!session || !session.admin_users || session.admin_users.role !== "super_admin" || !session.admin_users.is_active) {
      return jsonResponse2({ error: "Unauthorized. Super Admin access required." }, 403, corsHeaders);
    }
    const adminEmail = session.admin_users.email;
    if (action === "list_accounts") {
      const { data, error } = await supabase.from("admin_users").select("*").order("created_at", { ascending: false });
      if (error) return jsonResponse2({ error: error.message }, 500, corsHeaders);
      return jsonResponse2({ data }, 200, corsHeaders);
    }
    if (action === "list_sessions") {
      const { data, error } = await supabase.from("admin_sessions").select("id, ip_address, last_activity, expires_at, user_id, user_agent").gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).order("last_activity", { ascending: false }).limit(20);
      if (error) return jsonResponse2({ error: error.message }, 500, corsHeaders);
      return jsonResponse2({ data }, 200, corsHeaders);
    }
    if (action === "reset_device_by_email") {
      const { email } = body2;
      if (!email) return jsonResponse2({ error: "Email required" }, 400, corsHeaders);
      const { data: target, error: fe } = await supabase.from("admin_users").select("id, email").eq("email", email).single();
      if (fe || !target) return jsonResponse2({ error: "User not found" }, 404, corsHeaders);
      await supabase.from("admin_users").update({ device_fingerprint: null }).eq("id", target.id);
      return jsonResponse2({ success: true, message: "Device lock cleared for " + email }, 200, corsHeaders);
    }
    if (action === "create_account") {
      const { email, password, full_name, role } = body2;
      if (!email || !password) {
        return jsonResponse2({ error: "Email and password are required" }, 400, corsHeaders);
      }
      const { data: existingUser } = await supabase.from("admin_users").select("id").eq("email", email.toLowerCase()).single();
      if (existingUser) {
        return jsonResponse2({ error: "Email already exists" }, 400, corsHeaders);
      }
      const password_hash = await x(password, 10);
      const { data: newUser, error: insertError } = await supabase.from("admin_users").insert({
        email: email.toLowerCase(),
        password_hash,
        full_name: full_name || null,
        role: role || "editor",
        is_active: true
      }).select().single();
      if (insertError) {
        return jsonResponse2({ error: "Failed to create account" }, 500, corsHeaders);
      }
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "create_admin_account",
        details: {
          new_user_id: newUser.id,
          new_user_email: email.toLowerCase(),
          new_user_role: role || "editor"
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "info"
      });
      return jsonResponse2({
        success: true,
        message: `Admin account created for ${email}`,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role
        }
      }, 200, corsHeaders);
    }
    if (action === "update_account") {
      const { email, password, full_name, role, is_active } = body2;
      if (!targetUserId) {
        return jsonResponse2({ error: "Target user ID required" }, 400, corsHeaders);
      }
      if (!email) {
        return jsonResponse2({ error: "Email is required" }, 400, corsHeaders);
      }
      const { data: targetUser } = await supabase.from("admin_users").select("email").eq("id", targetUserId).single();
      const updateData = {
        email: email.toLowerCase(),
        full_name: full_name || null,
        role: role || "editor",
        is_active: is_active !== void 0 ? is_active : true
      };
      if (password) {
        updateData.password_hash = await x(password, 10);
      }
      const { error: updateError } = await supabase.from("admin_users").update(updateData).eq("id", targetUserId);
      if (updateError) {
        return jsonResponse2({ error: "Failed to update account" }, 500, corsHeaders);
      }
      if (password) {
        await supabase.from("admin_sessions").delete().eq("user_id", targetUserId);
      }
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "update_admin_account",
        details: {
          target_user_id: targetUserId,
          target_email: targetUser?.email,
          new_email: email.toLowerCase(),
          password_changed: !!password
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "info"
      });
      return jsonResponse2({
        success: true,
        message: `Admin account updated for ${email}`
      }, 200, corsHeaders);
    }
    if (action === "force_logout") {
      if (!targetUserId) {
        return jsonResponse2({ error: "Target user ID required" }, 400, corsHeaders);
      }
      const { data: targetUser } = await supabase.from("admin_users").select("email").eq("id", targetUserId).single();
      await supabase.from("admin_sessions").delete().eq("user_id", targetUserId);
      await supabase.from("admin_users").update({ status: "offline", last_heartbeat: null }).eq("id", targetUserId);
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "force_logout_admin",
        details: {
          target_user_id: targetUserId,
          target_email: targetUser?.email,
          reason: "Super Admin initiated force logout"
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "warning"
      });
      return jsonResponse2({
        success: true,
        message: `Successfully logged out ${targetUser?.email}`
      }, 200, corsHeaders);
    }
    if (action === "reset_device") {
      if (!targetUserId) {
        return jsonResponse2({ error: "Target user ID required" }, 400, corsHeaders);
      }
      const { data: targetUser } = await supabase.from("admin_users").select("email, device_fingerprint").eq("id", targetUserId).single();
      await supabase.from("admin_users").update({
        device_fingerprint: null,
        device_user_agent: null,
        device_ip: null,
        device_locked_at: null
      }).eq("id", targetUserId);
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "reset_device_lock",
        details: {
          target_user_id: targetUserId,
          target_email: targetUser?.email,
          previous_fingerprint: targetUser?.device_fingerprint,
          reason: "Super Admin initiated device reset"
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "info"
      });
      return jsonResponse2({
        success: true,
        message: `Device lock reset for ${targetUser?.email}`
      }, 200, corsHeaders);
    }
    if (action === "get_permissions") {
      if (!targetUserId) return jsonResponse2({ error: "targetUserId required" }, 400, corsHeaders);
      const { data, error } = await supabase.from("admin_permissions").select("page_slug,can_view,can_edit,can_delete").eq("user_id", targetUserId);
      if (error) return jsonResponse2({ error: error.message }, 500, corsHeaders);
      return jsonResponse2({ success: true, data: data || [] }, 200, corsHeaders);
    }
    if (action === "update_permissions") {
      const { permissions } = body2;
      if (!targetUserId || !permissions) {
        return jsonResponse2({ error: "Target user ID and permissions required" }, 400, corsHeaders);
      }
      const { data: targetUser } = await supabase.from("admin_users").select("email").eq("id", targetUserId).single();
      const { error: delError } = await supabase.from("admin_permissions").delete().eq("user_id", targetUserId);
      if (delError) {
        console.error("Delete permissions error:", delError);
        return jsonResponse2({ error: "Failed to delete old permissions: " + delError.message }, 500, corsHeaders);
      }
      const permissionRecords = permissions.filter((p2) => p2.can_view || p2.can_edit || p2.can_delete).map((p2) => ({
        user_id: targetUserId,
        page_slug: p2.page_slug,
        can_view: !!p2.can_view,
        can_edit: !!p2.can_edit,
        can_delete: !!p2.can_delete
      }));
      if (permissionRecords.length > 0) {
        const { error: insError } = await supabase.from("admin_permissions").insert(permissionRecords);
        if (insError) {
          console.error("Insert permissions error:", insError);
          return jsonResponse2({ error: "Failed to save permissions: " + insError.message }, 500, corsHeaders);
        }
      }
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "update_permissions",
        details: {
          target_user_id: targetUserId,
          target_email: targetUser?.email,
          permissions_count: permissionRecords.length
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "info"
      });
      return jsonResponse2({
        success: true,
        message: `Permissions updated for ${targetUser?.email}`
      }, 200, corsHeaders);
    }
    if (action === "disable_account") {
      if (!targetUserId) {
        return jsonResponse2({ error: "Target user ID required" }, 400, corsHeaders);
      }
      if (targetUserId === session.user_id) {
        return jsonResponse2({ error: "Cannot disable your own account" }, 400, corsHeaders);
      }
      const { data: targetUser } = await supabase.from("admin_users").select("email").eq("id", targetUserId).single();
      await supabase.from("admin_users").update({ is_active: false }).eq("id", targetUserId);
      await supabase.from("admin_sessions").delete().eq("user_id", targetUserId);
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "disable_account",
        details: {
          target_user_id: targetUserId,
          target_email: targetUser?.email
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "warning"
      });
      return jsonResponse2({
        success: true,
        message: `Account disabled for ${targetUser?.email}`
      }, 200, corsHeaders);
    }
    if (action === "enable_account") {
      if (!targetUserId) {
        return jsonResponse2({ error: "Target user ID required" }, 400, corsHeaders);
      }
      const { data: targetUser } = await supabase.from("admin_users").select("email").eq("id", targetUserId).single();
      await supabase.from("admin_users").update({ is_active: true }).eq("id", targetUserId);
      await supabase.from("admin_audit_logs").insert({
        user_id: session.user_id,
        email: adminEmail,
        action: "enable_account",
        details: {
          target_user_id: targetUserId,
          target_email: targetUser?.email
        },
        ip_address: clientIP,
        user_agent: userAgent,
        severity: "info"
      });
      return jsonResponse2({
        success: true,
        message: `Account enabled for ${targetUser?.email}`
      }, 200, corsHeaders);
    }
    return jsonResponse2({ error: "Unknown action" }, 400, corsHeaders);
  } catch (error) {
    console.error("Admin management error:", error);
    return jsonResponse2({ error: "Internal server error" }, 500, corsHeaders);
  }
}
function jsonResponse2(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
var init_admin_management = __esm({
  "admin-management.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    init_browser2();
    __name(onRequest9, "onRequest");
    __name(jsonResponse2, "jsonResponse");
  }
});

// admin-messages-api.js
async function onRequest10(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  try {
    let body2;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return jsonResponse3({ error: "Empty request body" }, 400, corsHeaders);
      }
      body2 = JSON.parse(text);
    } catch (parseError) {
      return jsonResponse3({ error: "Invalid JSON in request body", details: parseError.message }, 400, corsHeaders);
    }
    const { action, token, messageId, data } = body2;
    if (!token) {
      return jsonResponse3({ error: "No token provided" }, 401, corsHeaders);
    }
    const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
    if (!session || !session.admin_users || !session.admin_users.is_active) {
      return jsonResponse3({ error: "Invalid or expired session" }, 401, corsHeaders);
    }
    switch (action) {
      case "delete":
        if (!messageId) {
          return jsonResponse3({ error: "Message ID required" }, 400, corsHeaders);
        }
        const { error: deleteError } = await supabase.from("contact_messages").delete().eq("id", messageId);
        if (deleteError) {
          console.error("Delete error:", deleteError);
          return jsonResponse3({ error: "Failed to delete message", details: deleteError.message }, 500, corsHeaders);
        }
        return jsonResponse3({ success: true, message: "Message deleted" }, 200, corsHeaders);
      case "update":
        if (!messageId || !data) {
          return jsonResponse3({ error: "Message ID and data required" }, 400, corsHeaders);
        }
        const allowedUpdateFields = {};
        if (data.is_read !== void 0) allowedUpdateFields.is_read = !!data.is_read;
        if (data.notes !== void 0) allowedUpdateFields.notes = String(data.notes).slice(0, 2e3);
        const VALID_STATUSES = ["new", "read", "replied", "archived", "spam"];
        if (data.status !== void 0 && VALID_STATUSES.includes(data.status)) allowedUpdateFields.status = data.status;
        if (Object.keys(allowedUpdateFields).length === 0) {
          return jsonResponse3({ error: "No valid fields to update" }, 400, corsHeaders);
        }
        const { error: updateError } = await supabase.from("contact_messages").update(allowedUpdateFields).eq("id", messageId);
        if (updateError) {
          console.error("Update error:", updateError);
          return jsonResponse3({ error: "Failed to update message", details: updateError.message }, 500, corsHeaders);
        }
        return jsonResponse3({ success: true, message: "Message updated" }, 200, corsHeaders);
      case "list":
        const { data: messages, error: listError } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
        if (listError) {
          return jsonResponse3({ error: "Failed to fetch messages" }, 500, corsHeaders);
        }
        return jsonResponse3({ success: true, messages }, 200, corsHeaders);
      default:
        return jsonResponse3({ error: "Invalid action" }, 400, corsHeaders);
    }
  } catch (error) {
    console.error("Admin messages API error:", error);
    return jsonResponse3({ error: "Internal server error" }, 500, corsHeaders);
  }
}
function jsonResponse3(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
var init_admin_messages_api = __esm({
  "admin-messages-api.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    __name(onRequest10, "onRequest");
    __name(jsonResponse3, "jsonResponse");
  }
});

// admin-notifications-api.js
async function onRequest11(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS6 });
  if (request.method !== "POST") return json5({ error: "POST only" }, 405);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let body2;
  try {
    body2 = await request.json();
  } catch {
    return json5({ error: "Invalid JSON" }, 400);
  }
  if (body2.action === "process_scheduled") {
    const cronSecret = env.NOTIF_CRON_SECRET || env.CRON_SECRET;
    const authHeader = request.headers.get("Authorization") || "";
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
      return json5({ error: "Unauthorized" }, 401);
    const { data: due } = await supabase.from("admin_notifications").select("*").eq("status", "scheduled").eq("is_template", false).lte("scheduled_at", (/* @__PURE__ */ new Date()).toISOString()).limit(20);
    if (!due?.length) return json5({ success: true, processed: 0 });
    const results = [];
    for (const notif of due) {
      try {
        const { data: claimed } = await supabase.from("admin_notifications").update({ status: "sending" }).eq("id", notif.id).eq("status", "scheduled").select().single();
        if (!claimed) continue;
        const r2 = await doSend(supabase, env, notif, notif.id, "cron");
        results.push({ id: notif.id, ...r2 });
      } catch (e2) {
        await supabase.from("admin_notifications").update({ status: "failed", error_message: "Cron error: " + e2.message }).eq("id", notif.id).catch(() => {
        });
        results.push({ id: notif.id, error: e2.message });
      }
    }
    return json5({ success: true, processed: results.length, results });
  }
  if (body2.action === "auto_notify_content") {
    const cronSecret = env.NOTIF_CRON_SECRET || env.CRON_SECRET;
    const authHeader = request.headers.get("Authorization") || "";
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
      return json5({ error: "Unauthorized" }, 401);
    if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID)
      return json5({ error: "FCM not configured" }, 503);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString();
    const notified = [];
    async function alreadyNotified(dlType, dlId) {
      const { data } = await supabase.from("admin_notifications").select("id").eq("deep_link_type", dlType).eq("deep_link_id", String(dlId)).not("status", "in", '("draft","cancelled")').maybeSingle();
      return !!data;
    }
    __name(alreadyNotified, "alreadyNotified");
    async function sendAutoNotif(title, body3, image_url, dlType, dlId) {
      const { data: notif, error } = await supabase.from("admin_notifications").insert({
        title,
        body: body3,
        image_url: image_url || null,
        platform: "all",
        audience: "all",
        deep_link_type: dlType,
        deep_link_id: String(dlId),
        status: "sending",
        created_by: "auto"
      }).select().single();
      if (error || !notif) return { error: error?.message || "insert failed" };
      return await doSend(supabase, env, notif, notif.id, "auto");
    }
    __name(sendAutoNotif, "sendAutoNotif");
    const { data: episodes } = await supabase.from("islamvoice_episodes").select("id,title,thumbnail_url,created_at").eq("is_published", true).gte("created_at", twoHoursAgo).order("created_at", { ascending: false });
    for (const ep of episodes || []) {
      if (await alreadyNotified("video", ep.id)) continue;
      const r2 = await sendAutoNotif(
        ep.title,
        "\u0648\u0627\u0646\u06CE \u0646\u0648\u06CC \u0628\u06D5\u0631\u062F\u06D5\u0633\u062A\u06D5 \u{1F3AC}",
        ep.thumbnail_url,
        "video",
        ep.id
      );
      notified.push({ type: "video", id: ep.id, title: ep.title, ...r2 });
    }
    const { data: books } = await supabase.from("gencine_books").select("id,title,cover_url,created_at").gte("created_at", twoHoursAgo).order("created_at", { ascending: false });
    for (const book of books || []) {
      if (await alreadyNotified("book", book.id)) continue;
      const r2 = await sendAutoNotif(
        book.title,
        "\u06A9\u062A\u06CE\u0628\u06CE \u0646\u0648\u06CC \u0628\u06D5\u0631\u062F\u06D5\u0633\u062A\u06D5 \u{1F4DA}",
        book.cover_url,
        "book",
        book.id
      );
      notified.push({ type: "book", id: book.id, title: book.title, ...r2 });
    }
    const { data: hadiths } = await supabase.from("gencine_hadiths").select("id,title,created_at").gte("created_at", twoHoursAgo).order("created_at", { ascending: false });
    for (const h2 of hadiths || []) {
      if (await alreadyNotified("hadith", h2.id)) continue;
      const r2 = await sendAutoNotif(
        h2.title || "\u062D\u06D5\u062F\u06CC\u0633",
        null,
        null,
        "hadith",
        h2.id
      );
      notified.push({ type: "hadith", id: h2.id, title: h2.title, ...r2 });
    }
    return json5({ success: true, notified: notified.length, results: notified });
  }
  const token = ((request.headers.get("Authorization") || "").replace("Bearer ", "") || body2.token || "").trim();
  if (!token) return json5({ error: "No token" }, 401);
  const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, email)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
  if (!session?.admin_users) return json5({ error: "Unauthorized" }, 403);
  const role = session.admin_users.role;
  const adminEmail = session.admin_users.email;
  const isWriter = role === "super_admin" || role === "editor";
  const isSuperAdmin = role === "super_admin";
  const { action } = body2;
  if (action === "list") {
    let q = supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(200);
    q = q.neq("deep_link_type", "prayer_reminder_config");
    if (body2.status) q = q.eq("status", body2.status);
    if (body2.platform && body2.platform !== "all") q = q.eq("platform", body2.platform);
    if (body2.search) q = q.or(`title.ilike.%${body2.search}%,body.ilike.%${body2.search}%`);
    const { data, error } = await q;
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true, notifications: data || [] });
  }
  if (action === "get") {
    if (!body2.id) return json5({ error: "id required" }, 400);
    const { data, error } = await supabase.from("admin_notifications").select("*").eq("id", body2.id).single();
    if (error) return json5({ error: error.message }, 500);
    if (!data) return json5({ error: "Not found" }, 404);
    return json5({ success: true, notification: data });
  }
  if (action === "get_stats") {
    const [{ data: allNotifs }, { data: tokenCount }] = await Promise.all([
      supabase.from("admin_notifications").select("status, tokens_targeted, tokens_sent, tokens_failed"),
      supabase.from("push_tokens").select("id", { count: "exact", head: true })
    ]);
    const sent = (allNotifs || []).filter((n2) => n2.status === "sent");
    const scheduled = (allNotifs || []).filter((n2) => n2.status === "scheduled").length;
    const totalSent = sent.length;
    const totalTargeted = sent.reduce((s2, n2) => s2 + (n2.tokens_targeted || 0), 0);
    const totalDelivered = sent.reduce((s2, n2) => s2 + (n2.tokens_sent || 0), 0);
    const deliveryRate = totalTargeted > 0 ? Math.round(totalDelivered / totalTargeted * 100) : 0;
    return json5({
      success: true,
      stats: {
        totalSent,
        totalScheduled: scheduled,
        totalNotifications: (allNotifs || []).length,
        activeTokens: tokenCount || 0,
        deliveryRate,
        totalDelivered,
        totalTargeted
      }
    });
  }
  if (action === "get_token_count") {
    const audience = body2.audience || "all";
    const platform = body2.platform || "all";
    let q = supabase.from("push_tokens").select("id", { count: "exact", head: true });
    if (platform !== "all") q = q.eq("platform", platform);
    if (audience === "authenticated") q = q.not("user_id", "is", null);
    else if (audience === "unauthenticated") q = q.is("user_id", null);
    else if (audience === "android") q = q.eq("platform", "android");
    else if (audience === "ios") q = q.eq("platform", "ios");
    const { count, error } = await q;
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true, count: count || 0 });
  }
  if (action === "get_analytics") {
    const ago30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const [{ data: sentNotifs }, { data: allNotifs }] = await Promise.all([
      supabase.from("admin_notifications").select("sent_at, platform, tokens_targeted, tokens_sent, tokens_failed, title").eq("status", "sent").eq("is_template", false).gte("sent_at", ago30).order("sent_at", { ascending: true }).limit(500),
      supabase.from("admin_notifications").select("status, platform, tokens_targeted, tokens_sent, tokens_failed").eq("is_template", false)
    ]);
    const dayMap = {};
    for (let d2 = 0; d2 < 30; d2++) {
      const dt = new Date(Date.now() - (29 - d2) * 864e5);
      dayMap[dt.toISOString().slice(0, 10)] = { sent: 0, delivered: 0, targeted: 0 };
    }
    for (const n2 of sentNotifs || []) {
      if (!n2.sent_at) continue;
      const k = new Date(n2.sent_at).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
      if (dayMap[k]) {
        dayMap[k].sent++;
        dayMap[k].delivered += n2.tokens_sent || 0;
        dayMap[k].targeted += n2.tokens_targeted || 0;
      }
    }
    const dailyData = Object.keys(dayMap).sort().map((date) => ({
      date,
      sent: dayMap[date].sent,
      delivered: dayMap[date].delivered,
      targeted: dayMap[date].targeted,
      rate: dayMap[date].targeted > 0 ? Math.round(dayMap[date].delivered / dayMap[date].targeted * 100) : 0
    }));
    const byPlatform = { all: 0, android: 0, ios: 0 };
    for (const n2 of (allNotifs || []).filter((n3) => n3.status === "sent"))
      byPlatform[n2.platform] = (byPlatform[n2.platform] || 0) + 1;
    const topNotifs = (sentNotifs || []).filter((n2) => (n2.tokens_targeted || 0) >= 10).map((n2) => ({
      title: n2.title,
      sent_at: n2.sent_at,
      targeted: n2.tokens_targeted || 0,
      delivered: n2.tokens_sent || 0,
      failed: n2.tokens_failed || 0,
      rate: Math.round((n2.tokens_sent || 0) / n2.tokens_targeted * 100)
    })).sort((a2, b) => b.rate - a2.rate).slice(0, 5);
    const sentAll = (allNotifs || []).filter((n2) => n2.status === "sent");
    const totalTargeted = sentAll.reduce((s2, n2) => s2 + (n2.tokens_targeted || 0), 0);
    const totalDelivered = sentAll.reduce((s2, n2) => s2 + (n2.tokens_sent || 0), 0);
    const avgRate = totalTargeted > 0 ? Math.round(totalDelivered / totalTargeted * 100) : 0;
    return json5({
      success: true,
      dailyData,
      byPlatform,
      topNotifs,
      totals: {
        campaigns: sentAll.length,
        totalDelivered,
        totalTargeted,
        avgRate
      }
    });
  }
  if (!isWriter) return json5({ error: "Insufficient permissions" }, 403);
  if (action === "create") {
    const {
      title,
      body: msgBody,
      image_url,
      platform,
      audience,
      deep_link_type,
      deep_link_id,
      scheduled_at,
      recurrence,
      recurrence_day,
      notes,
      is_template
    } = body2;
    if (!title || !msgBody) return json5({ error: "title and body required" }, 400);
    const status = scheduled_at ? "scheduled" : "draft";
    const { data, error } = await supabase.from("admin_notifications").insert({
      title,
      body: msgBody,
      image_url: image_url || null,
      platform: platform || "all",
      audience: audience || "all",
      deep_link_type: deep_link_type || "none",
      deep_link_id: deep_link_id || null,
      status,
      scheduled_at: scheduled_at || null,
      recurrence: recurrence || "none",
      recurrence_day: recurrence_day != null ? recurrence_day : null,
      notes: notes || null,
      is_template: is_template === true,
      created_by: adminEmail
    }).select().single();
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true, notification: data });
  }
  if (action === "update") {
    if (!body2.id) return json5({ error: "id required" }, 400);
    const { data: existing } = await supabase.from("admin_notifications").select("status").eq("id", body2.id).single();
    if (!existing) return json5({ error: "Not found" }, 404);
    if (!["draft", "scheduled"].includes(existing.status))
      return json5({ error: "Can only edit draft or scheduled notifications" }, 400);
    const {
      title,
      body: msgBody,
      image_url,
      platform,
      audience,
      deep_link_type,
      deep_link_id,
      scheduled_at,
      recurrence,
      recurrence_day,
      notes,
      is_template
    } = body2;
    const status = scheduled_at ? "scheduled" : "draft";
    const { data, error } = await supabase.from("admin_notifications").update({
      title,
      body: msgBody,
      image_url: image_url || null,
      platform: platform || "all",
      audience: audience || "all",
      deep_link_type: deep_link_type || "none",
      deep_link_id: deep_link_id || null,
      status,
      scheduled_at: scheduled_at || null,
      recurrence: recurrence || "none",
      recurrence_day: recurrence_day != null ? recurrence_day : null,
      notes: notes || null,
      is_template: is_template === true
    }).eq("id", body2.id).select().single();
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true, notification: data });
  }
  if (action === "send") {
    if (!body2.id) return json5({ error: "id required" }, 400);
    const { data: notif } = await supabase.from("admin_notifications").select("*").eq("id", body2.id).single();
    if (!notif) return json5({ error: "Not found" }, 404);
    if (notif.status === "sending") return json5({ error: "Already sending" }, 400);
    if (notif.status === "cancelled") return json5({ error: "Cannot send cancelled notification" }, 400);
    if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) return json5({ error: "FCM not configured" }, 503);
    let trackingId = body2.id;
    if (notif.is_template) {
      const { data: copy } = await supabase.from("admin_notifications").insert({
        title: notif.title,
        body: notif.body,
        image_url: notif.image_url,
        platform: notif.platform,
        audience: notif.audience,
        deep_link_type: notif.deep_link_type,
        deep_link_id: notif.deep_link_id,
        recurrence: notif.recurrence,
        recurrence_day: notif.recurrence_day,
        notes: notif.notes,
        created_by: adminEmail,
        status: "sending",
        is_template: false
      }).select().single();
      if (!copy) return json5({ error: "Failed to create send record" }, 500);
      trackingId = copy.id;
    } else {
      await supabase.from("admin_notifications").update({ status: "sending" }).eq("id", body2.id);
    }
    const r2 = await doSend(supabase, env, notif, trackingId, adminEmail);
    if (r2.error) return json5({ error: r2.error }, 500);
    return json5({
      success: true,
      sent: r2.sent,
      failed: r2.failed,
      total: r2.total,
      stale_removed: r2.stale_removed,
      next_scheduled: notif.recurrence !== "none"
    });
  }
  if (action === "cancel") {
    if (!body2.id) return json5({ error: "id required" }, 400);
    const { error } = await supabase.from("admin_notifications").update({ status: "cancelled" }).eq("id", body2.id).in("status", ["draft", "scheduled"]);
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true });
  }
  if (action === "delete") {
    if (!isSuperAdmin) return json5({ error: "Super Admin only" }, 403);
    if (!body2.id) return json5({ error: "id required" }, 400);
    const { error } = await supabase.from("admin_notifications").delete().eq("id", body2.id);
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true });
  }
  if (action === "duplicate") {
    if (!body2.id) return json5({ error: "id required" }, 400);
    const { data: src } = await supabase.from("admin_notifications").select("*").eq("id", body2.id).single();
    if (!src) return json5({ error: "Not found" }, 404);
    const { data, error } = await supabase.from("admin_notifications").insert({
      title: src.title + " (Copy)",
      body: src.body,
      image_url: src.image_url,
      platform: src.platform,
      audience: src.audience,
      deep_link_type: src.deep_link_type,
      deep_link_id: src.deep_link_id,
      status: "draft",
      notes: src.notes,
      created_by: adminEmail
    }).select().single();
    if (error) return json5({ error: error.message }, 500);
    return json5({ success: true, notification: data });
  }
  return json5({ error: "Unknown action" }, 400);
}
function json5(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS6 });
}
async function doSend(supabase, env, notif, trackingId, sentBy) {
  let tokens;
  try {
    tokens = await getTokensForAudience(env, notif.audience, notif.platform);
  } catch (e2) {
    await supabase.from("admin_notifications").update({ status: "failed", error_message: "Token fetch: " + e2.message }).eq("id", trackingId);
    return { error: "Token fetch failed: " + e2.message };
  }
  if (!tokens.length) {
    await supabase.from("admin_notifications").update({
      status: "sent",
      sent_at: (/* @__PURE__ */ new Date()).toISOString(),
      tokens_targeted: 0,
      tokens_sent: 0,
      tokens_failed: 0,
      stale_removed: 0
    }).eq("id", trackingId);
    return { sent: 0, failed: 0, total: 0, stale_removed: 0 };
  }
  const apnsTokens = tokens.filter((t2) => isApnsToken(t2.token));
  const fcmTokens = tokens.filter((t2) => !isApnsToken(t2.token));
  let accessToken = null;
  if (fcmTokens.length && env.FCM_SERVICE_ACCOUNT) {
    try {
      accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT);
    } catch (e2) {
      if (!apnsTokens.length) {
        await supabase.from("admin_notifications").update({ status: "failed", error_message: "FCM auth: " + e2.message }).eq("id", trackingId);
        return { error: "FCM auth error: " + e2.message };
      }
    }
  }
  let apnsJwt = null, apnsJwtError = null;
  if (apnsTokens.length && env.APNS_KEY_P8) {
    try {
      apnsJwt = await getAPNsJWT(env.APNS_KEY_P8, env.APNS_KEY_ID || "KLG2RRCRNR", env.APNS_TEAM_ID || "8KA7UDSC9D");
    } catch (e2) {
      apnsJwtError = "APNs JWT: " + e2.message;
    }
  }
  const deepLinkData = buildDeepLinkData(notif.deep_link_type, notif.deep_link_id);
  const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
  const staleTokens = [], apnsErrors = [];
  let successCount = 0, failCount = 0;
  await Promise.allSettled([
    ...fcmTokens.map(async ({ token, platform }) => {
      if (!accessToken) {
        failCount++;
        return;
      }
      const res = await fetch(FCM_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: buildFCMMessage(token, platform, notif.title, notif.body, notif.image_url, deepLinkData) })
      });
      if (res.ok) {
        successCount++;
      } else {
        const err = await res.json().catch(() => ({}));
        if (err?.error?.status === "NOT_FOUND" || err?.error?.status === "UNREGISTERED") staleTokens.push(token);
        failCount++;
      }
    }),
    ...apnsTokens.map(async ({ token }) => {
      if (!apnsJwt) {
        apnsErrors.push(apnsJwtError || "JWT missing");
        failCount++;
        return;
      }
      const res = await sendApns(token, notif.title, notif.body, deepLinkData, apnsJwt, "com.tafsirkurd.app");
      if (res.ok) {
        successCount++;
      } else {
        const errText = await res.text().catch(() => "");
        const err = JSON.parse(errText || "{}");
        apnsErrors.push(`APNs ${res.status}: ${err?.reason || errText}`);
        if (res.status === 410 || err?.reason === "BadDeviceToken" || err?.reason === "Unregistered") staleTokens.push(token);
        failCount++;
      }
    })
  ]);
  if (staleTokens.length) await removeStaleTokens(env, staleTokens).catch(() => {
  });
  await supabase.from("admin_notifications").update({
    status: "sent",
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    tokens_targeted: tokens.length,
    tokens_sent: successCount,
    tokens_failed: failCount,
    stale_removed: staleTokens.length,
    error_message: apnsErrors.length ? apnsErrors[0] : null
  }).eq("id", trackingId);
  if (notif.recurrence && notif.recurrence !== "none") {
    try {
      const nextAt = nextOccurrence(notif.recurrence, notif.recurrence_day, notif.scheduled_at);
      if (nextAt) {
        const { error: insErr } = await supabase.from("admin_notifications").insert({
          title: notif.title,
          body: notif.body,
          image_url: notif.image_url || null,
          platform: notif.platform || "all",
          audience: notif.audience || "all",
          deep_link_type: notif.deep_link_type || "none",
          deep_link_id: notif.deep_link_id || null,
          recurrence: notif.recurrence,
          recurrence_day: notif.recurrence_day || null,
          notes: notif.notes || null,
          created_by: sentBy || "cron",
          status: "scheduled",
          scheduled_at: nextAt,
          is_template: false
        });
        if (insErr) console.error("Next occurrence insert failed:", insErr.message);
      }
    } catch (e2) {
      console.error("nextOccurrence error:", e2.message);
    }
  }
  return { sent: successCount, failed: failCount, total: tokens.length, stale_removed: staleTokens.length };
}
async function getTokensForAudience(env, audience, platform) {
  let url = `${env.SUPABASE_URL}/rest/v1/push_tokens?select=token,platform`;
  if (platform === "android") url += "&platform=eq.android";
  else if (platform === "ios") url += "&platform=eq.ios";
  if (audience === "authenticated") url += "&user_id=not.is.null";
  else if (audience === "unauthenticated") url += "&user_id=is.null";
  else if (audience === "android") url += "&platform=eq.android";
  else if (audience === "ios") url += "&platform=eq.ios";
  url += "&limit=10000";
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return await res.json();
}
async function removeStaleTokens(env, tokens) {
  const inList = tokens.map((t2) => `"${t2}"`).join(",");
  await fetch(`${env.SUPABASE_URL}/rest/v1/push_tokens?token=in.(${inList})`, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal"
    }
  });
}
function buildDeepLinkData(type, id) {
  if (!type || type === "none") return {};
  const d2 = { type };
  if (id) d2.id = String(id);
  return d2;
}
function buildFCMMessage(token, platform, title, body2, imageUrl, data) {
  const msg = {
    token,
    notification: { title, body: body2 },
    data: Object.fromEntries(Object.entries(data).map(([k, v2]) => [k, String(v2)]))
  };
  if (imageUrl) {
    if (platform === "android") {
      msg.android = {
        priority: "high",
        notification: {
          icon: "ic_notification",
          color: "#1f5f4a",
          image_url: imageUrl
        }
      };
    } else if (platform === "ios") {
      msg.apns = {
        payload: { aps: { badge: 1, sound: "default" } },
        fcm_options: { image: imageUrl }
      };
    }
  } else {
    if (platform === "android") {
      msg.android = {
        priority: "high",
        notification: { icon: "ic_notification", color: "#1f5f4a" }
      };
    } else if (platform === "ios") {
      msg.apns = { payload: { aps: { badge: 1, sound: "default" } } };
    }
  }
  return msg;
}
async function getFCMAccessToken(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1e3);
  const headerB64 = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimB64 = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const sigInput = `${headerB64}.${claimB64}`;
  const key = await importRSAKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(sigInput));
  const jwt = `${sigInput}.${b64urlRaw(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const d2 = await res.json();
  if (!d2.access_token) throw new Error(JSON.stringify(d2));
  return d2.access_token;
}
function b64url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64urlRaw(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i2 = 0; i2 < bin.length; i2++) buf[i2] = bin.charCodeAt(i2);
  return buf.buffer;
}
function nextOccurrence(recurrence, recurrenceDay, scheduledAt) {
  const now = /* @__PURE__ */ new Date();
  const refTime = scheduledAt ? new Date(scheduledAt) : null;
  const h2 = refTime ? refTime.getUTCHours() : 9;
  const m2 = refTime ? refTime.getUTCMinutes() : 0;
  if (recurrence === "daily") {
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(h2, m2, 0, 0);
    return next.toISOString();
  }
  if (recurrence === "weekly" && recurrenceDay != null) {
    const next = new Date(now);
    const currentDay = next.getUTCDay();
    let daysUntil = (recurrenceDay - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    next.setUTCDate(next.getUTCDate() + daysUntil);
    next.setUTCHours(h2, m2, 0, 0);
    return next.toISOString();
  }
  return null;
}
async function importRSAKey(pem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}
function isApnsToken(token) {
  return /^[0-9a-f]{64}$/i.test(token);
}
async function importECKey(pem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}
async function getAPNsJWT(keyP8, keyId, teamId) {
  const key = await importECKey(keyP8);
  const now = Math.floor(Date.now() / 1e3);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const sigInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(sigInput)
  );
  return `${sigInput}.${b64urlRaw(sig)}`;
}
async function sendApns(deviceToken, title, body2, extraData, jwt, bundleId) {
  const apsPayload = {
    aps: { alert: { title, body: body2 }, badge: 1, sound: "default" },
    ...extraData
  };
  return fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json"
    },
    body: JSON.stringify(apsPayload)
  });
}
var CORS6;
var init_admin_notifications_api = __esm({
  "admin-notifications-api.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS6 = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    __name(onRequest11, "onRequest");
    __name(json5, "json");
    __name(doSend, "doSend");
    __name(getTokensForAudience, "getTokensForAudience");
    __name(removeStaleTokens, "removeStaleTokens");
    __name(buildDeepLinkData, "buildDeepLinkData");
    __name(buildFCMMessage, "buildFCMMessage");
    __name(getFCMAccessToken, "getFCMAccessToken");
    __name(b64url, "b64url");
    __name(b64urlRaw, "b64urlRaw");
    __name(pemToDer, "pemToDer");
    __name(nextOccurrence, "nextOccurrence");
    __name(importRSAKey, "importRSAKey");
    __name(isApnsToken, "isApnsToken");
    __name(importECKey, "importECKey");
    __name(getAPNsJWT, "getAPNsJWT");
    __name(sendApns, "sendApns");
  }
});

// admin-stats.js
async function onRequest12(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse4({ error: "Method not allowed" }, 405, corsHeaders);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  try {
    let body2;
    try {
      body2 = await request.json();
    } catch {
      return jsonResponse4({ error: "Invalid JSON" }, 400, corsHeaders);
    }
    const { token } = body2;
    if (!token) return jsonResponse4({ error: "No token" }, 401, corsHeaders);
    const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, is_active)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
    if (!session?.admin_users?.is_active) return jsonResponse4({ error: "Unauthorized" }, 401, corsHeaders);
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 864e5);
    const ago7 = new Date(now.getTime() - 7 * 864e5);
    const ago30 = new Date(now.getTime() - 30 * 864e5);
    const [
      activeToday,
      activeYesterday,
      active7d,
      active30d,
      signupRows,
      activeRows,
      recentUserRows
    ] = await Promise.all([
      // Active counts
      supabase.from("user_data").select("*", { count: "exact", head: true }).gte("updated_at", today.toISOString()),
      supabase.from("user_data").select("*", { count: "exact", head: true }).gte("updated_at", yesterday.toISOString()).lt("updated_at", today.toISOString()),
      supabase.from("user_data").select("*", { count: "exact", head: true }).gte("updated_at", ago7.toISOString()),
      supabase.from("user_data").select("*", { count: "exact", head: true }).gte("updated_at", ago30.toISOString()),
      // Chart: daily signups last 30 days
      supabase.from("user_data").select("created_at").gte("created_at", ago30.toISOString()).order("created_at", { ascending: true }).limit(5e3),
      // Chart: daily active last 7 days
      supabase.from("user_data").select("updated_at").gte("updated_at", ago7.toISOString()).limit(5e3),
      // Recent users for the panel
      supabase.from("user_data").select("user_id, created_at").order("created_at", { ascending: false }).limit(5)
    ]);
    const growthMap = {};
    for (let d2 = 0; d2 < 30; d2++) {
      const dt = new Date(ago30.getTime() + d2 * 864e5);
      growthMap[dt.toISOString().slice(0, 10)] = 0;
    }
    (signupRows.data || []).forEach((r2) => {
      const k = new Date(r2.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
      if (growthMap.hasOwnProperty(k)) growthMap[k]++;
    });
    const growthData = Object.keys(growthMap).sort().map((date) => ({ date, count: growthMap[date] }));
    const activeMap = {};
    for (let d2 = 0; d2 < 7; d2++) {
      const dt = new Date(ago7.getTime() + d2 * 864e5);
      activeMap[dt.toISOString().slice(0, 10)] = 0;
    }
    (activeRows.data || []).forEach((r2) => {
      const k = new Date(r2.updated_at).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
      if (activeMap.hasOwnProperty(k)) activeMap[k]++;
    });
    const activeData = Object.keys(activeMap).sort().map((date) => ({ date, count: activeMap[date] }));
    return jsonResponse4({
      success: true,
      activeToday: activeToday.count || 0,
      activeYesterday: activeYesterday.count || 0,
      active7d: active7d.count || 0,
      active30d: active30d.count || 0,
      growthData,
      activeData,
      recentUsers: recentUserRows.data || []
    }, 200, corsHeaders);
  } catch (e2) {
    console.error("admin-stats error:", e2);
    return jsonResponse4({ error: "Internal server error" }, 500, corsHeaders);
  }
}
function jsonResponse4(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
var init_admin_stats = __esm({
  "admin-stats.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    __name(onRequest12, "onRequest");
    __name(jsonResponse4, "jsonResponse");
  }
});

// admin-translations-api.js
async function onRequest13(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return json6({ error: "POST only" }, 405, corsHeaders);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  try {
    const body2 = await request.json();
    const { action } = body2;
    const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim() || (body2.token || "").trim();
    if (!token) return json6({ error: "No token" }, 401, corsHeaders);
    const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, full_name, email)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
    if (!session?.admin_users) return json6({ error: "Unauthorized" }, 403, corsHeaders);
    const role = session.admin_users.role;
    const userId = session.user_id;
    if (role !== "super_admin" && role !== "editor") {
      if (role === "custom") {
        const { data: perm } = await supabase.from("admin_permissions").select("can_edit").eq("user_id", userId).eq("page_slug", "translations").single();
        if (!perm?.can_edit) return json6({ error: "Write access denied" }, 403, corsHeaders);
      } else {
        return json6({ error: "Write access denied" }, 403, corsHeaders);
      }
    }
    if (action === "update") {
      const { id, fields } = body2;
      if (!id || !fields) return json6({ error: "id and fields required" }, 400, corsHeaders);
      const { error } = await supabase.from("kurdish_translations").update(fields).eq("id", id);
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true });
    }
    if (action === "insert") {
      const { fields } = body2;
      if (!fields) return json6({ error: "fields required" }, 400, corsHeaders);
      const { data, error } = await supabase.from("kurdish_translations").insert([fields]).select().single();
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true, row: data });
    }
    if (action === "delete") {
      const { id } = body2;
      if (!id) return json6({ error: "id required" }, 400, corsHeaders);
      const { data: row } = await supabase.from("kurdish_translations").select("key_id").eq("id", id).single();
      const { error } = await supabase.from("kurdish_translations").delete().eq("id", id);
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      if (row?.key_id) {
        await supabase.from("deleted_translation_keys").upsert({ key_id: row.key_id }, { onConflict: "key_id" });
      }
      return json6({ success: true });
    }
    if (action === "delete_by_keys") {
      const { key_ids } = body2;
      if (!Array.isArray(key_ids) || !key_ids.length) return json6({ error: "key_ids required" }, 400, corsHeaders);
      const { error } = await supabase.from("kurdish_translations").delete().in("key_id", key_ids);
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      const blocks = key_ids.map(function(k) {
        return { key_id: k };
      });
      await supabase.from("deleted_translation_keys").upsert(blocks, { onConflict: "key_id" });
      return json6({ success: true, deleted: key_ids.length });
    }
    if (action === "upsert_by_key") {
      const { key_id, kurdish_text } = body2;
      if (!key_id) return json6({ error: "key_id required" }, 400, corsHeaders);
      const { error } = await supabase.from("kurdish_translations").upsert({ key_id, kurdish_text: kurdish_text || "" }, { onConflict: "key_id" });
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true });
    }
    if (action === "upsert_site_setting") {
      const { key, value } = body2;
      if (!key) return json6({ error: "key required" }, 400, corsHeaders);
      const { error } = await supabase.from("site_settings").upsert({ key, value: value || "" }, { onConflict: "key" });
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true });
    }
    if (action === "bulk_insert") {
      const { rows } = body2;
      if (!Array.isArray(rows) || rows.length === 0)
        return json6({ error: "rows array required" }, 400, corsHeaders);
      const { error } = await supabase.from("kurdish_translations").insert(rows);
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true, count: rows.length });
    }
    if (action === "bulk_update_by_key") {
      const { items } = body2;
      if (!Array.isArray(items) || items.length === 0)
        return json6({ error: "items array required" }, 400, corsHeaders);
      const results = await Promise.all(items.map(
        (item) => supabase.from("kurdish_translations").update(item.fields).eq("key_id", item.key_id)
      ));
      const errors = results.filter((r2) => r2.error).length;
      return json6({ success: true, updated: items.length - errors, errors });
    }
    if (action === "log_activity") {
      const { action_type, description } = body2;
      if (!action_type || !description) return json6({ error: "action_type and description required" }, 400, corsHeaders);
      const adminName = session.admin_users?.full_name || session.admin_users?.email || "Admin";
      const { error } = await supabase.from("admin_activity_log").insert({ admin_name: adminName, action_type, description });
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true });
    }
    if (action === "validate_translations") {
      const { platform } = body2;
      const CRITICAL_DB_KEYS = [
        "tabs.quran",
        "tabs.video",
        "tabs.prayer",
        "tabs.gencine",
        "tabs.settings",
        "tabs.goals",
        "tabs.bookmarks",
        "header.prayer",
        "header.gencine",
        "prayer.fajr",
        "prayer.sunrise",
        "prayer.dhuhr",
        "prayer.asr",
        "prayer.maghrib",
        "prayer.isha",
        "settings.language",
        "iv.loading"
      ];
      let query = supabase.from("kurdish_translations").select("key_id, kurdish_text, page");
      if (platform) query = query.eq("page", platform);
      const { data: rows, error: qErr } = await query;
      if (qErr) return json6({ error: qErr.message }, 500, corsHeaders);
      const keyMap = Object.fromEntries((rows || []).map((r2) => [r2.key_id, r2.kurdish_text]));
      const errors = [], warnings = [];
      for (const k of CRITICAL_DB_KEYS) {
        if (k in keyMap && (!keyMap[k] || !keyMap[k].trim())) {
          errors.push({ key: k, issue: "empty" });
        }
        if (!(k in keyMap)) {
          warnings.push({ key: k, issue: "db_missing_covered_by_bundle" });
        }
      }
      for (const row of rows || []) {
        const v2 = row.kurdish_text;
        if (v2 === row.key_id) {
          errors.push({ key: row.key_id, issue: "value_equals_key" });
        } else if (v2 && (v2.includes("[object") || v2.includes("undefined"))) {
          errors.push({ key: row.key_id, issue: "corrupted_value", value: v2.slice(0, 60) });
        } else if (!v2 || !v2.trim()) {
          warnings.push({ key: row.key_id, issue: "empty_value" });
        }
      }
      return json6({
        success: true,
        valid: errors.length === 0,
        total_keys: (rows || []).length,
        errors,
        warnings: warnings.slice(0, 50)
      });
    }
    if (action === "bump_i18n_version") {
      const newVersion = String(Date.now());
      const publishedAt = (/* @__PURE__ */ new Date()).toISOString();
      const [vErr, tErr] = await Promise.all([
        supabase.from("site_settings").upsert({ key: "i18n_cache_version", value: newVersion }, { onConflict: "key" }).then((r2) => r2.error),
        supabase.from("site_settings").upsert({ key: "i18n_last_published_at", value: publishedAt }, { onConflict: "key" }).then((r2) => r2.error)
      ]);
      if (vErr || tErr) return json6({ error: (vErr || tErr).message }, 500, corsHeaders);
      const adminName = session.admin_users?.full_name || session.admin_users?.email || "Admin";
      await supabase.from("admin_activity_log").insert({
        admin_name: adminName,
        action_type: "i18n_version_bump",
        description: "i18n cache version bumped to " + newVersion + " \u2014 all devices will clear translation cache"
      });
      return json6({ success: true, version: newVersion, published_at: publishedAt });
    }
    if (action === "set_i18n_health_reporting") {
      const { enabled } = body2;
      if (typeof enabled !== "boolean") return json6({ error: "enabled (boolean) required" }, 400, corsHeaders);
      const { error } = await supabase.from("site_settings").upsert({ key: "i18n_health_reporting_enabled", value: enabled ? "true" : "false" }, { onConflict: "key" });
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true, enabled });
    }
    if (action === "set_badge") {
      const ALLOWED = ["gencine_hadiths", "gencine_duas", "gencine_adhkar", "gencine_books", "gencine_sections"];
      const { table, id, badge_until } = body2;
      if (!table || !ALLOWED.includes(table)) return json6({ error: "invalid table" }, 400, corsHeaders);
      if (!id) return json6({ error: "id required" }, 400, corsHeaders);
      const { error } = await supabase.from(table).update({ badge_until: badge_until || null }).eq("id", id);
      if (error) return json6({ error: error.message }, 500, corsHeaders);
      return json6({ success: true });
    }
    return json6({ error: "Unknown action" }, 400, corsHeaders);
  } catch (err) {
    console.error("admin-translations error:", err);
    return json6({ error: "Internal server error" }, 500, corsHeaders);
  }
}
function json6(data, status = 200, headers = {
  "Access-Control-Allow-Origin": "https://tafsirkurd.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
}) {
  return new Response(JSON.stringify(data), { status, headers });
}
var init_admin_translations_api = __esm({
  "admin-translations-api.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    __name(onRequest13, "onRequest");
    __name(json6, "json");
  }
});

// admin-users-data.js
function parseAppData(appData) {
  if (!appData || typeof appData !== "object") return {};
  let currentSurah = 0, currentAyah = 0;
  try {
    const lr = JSON.parse(appData.lastRead || "null");
    if (lr) {
      currentSurah = lr.surah || 0;
      currentAyah = lr.ayah || 0;
    }
  } catch (e2) {
  }
  let totalAyahsRead = 0, activeDaysTotal = 0, activeDays30 = 0;
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  try {
    const rl = JSON.parse(appData.readLog || "{}");
    Object.keys(rl).forEach((d2) => {
      const v2 = parseInt(rl[d2]) || 0;
      totalAyahsRead += v2;
      activeDaysTotal++;
      if (d2 >= thirtyAgo) activeDays30++;
    });
  } catch (e2) {
  }
  let bookmarksCount = 0;
  try {
    const bms = JSON.parse(appData.app_bookmarks || "[]");
    bookmarksCount = Array.isArray(bms) ? bms.length : 0;
  } catch (e2) {
  }
  let surahsStarted = 0, surahsCompleted = 0;
  for (let i2 = 1; i2 <= 114; i2++) {
    const raw = appData["surah_progress_" + i2];
    if (raw) {
      try {
        const ayahs = JSON.parse(raw);
        if (Array.isArray(ayahs) && ayahs.length > 0) {
          surahsStarted++;
          if (ayahs.length >= (SURAH_AYAHS[i2] || 9999)) surahsCompleted++;
        }
      } catch (e2) {
      }
    }
  }
  let readingGoal = 0;
  try {
    readingGoal = parseInt(appData.readingGoal) || 0;
  } catch (e2) {
  }
  return {
    currentSurah,
    currentAyah,
    totalAyahsRead,
    activeDaysTotal,
    activeDays30,
    bookmarksCount,
    surahsStarted,
    surahsCompleted,
    bestStreak: parseInt(appData.bestStreak) || 0,
    readingGoal,
    reciter: appData.app_reciter || "",
    dailyReminder: appData.dailyReminder === "true",
    theme: appData.theme || "light",
    showTafsir: appData.showTafsir !== "false"
  };
}
async function onRequest14(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse5({ error: "Method not allowed" }, 405, corsHeaders);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  try {
    const body2 = await request.json();
    const { action } = body2;
    const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim() || (body2.token || "").trim();
    if (!token) return jsonResponse5({ error: "No token provided" }, 401, corsHeaders);
    const { data: session } = await supabase.from("admin_sessions").select("user_id, admin_users(role, email)").eq("token", token).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).single();
    if (!session || !session.admin_users)
      return jsonResponse5({ error: "Unauthorized" }, 403, corsHeaders);
    const role = session.admin_users.role;
    if (role !== "super_admin" && role !== "analyst")
      return jsonResponse5({ error: "Insufficient permissions" }, 403, corsHeaders);
    if (action === "get_users") {
      const [{ data: profiles, error: pe }, { data: userData, error: ue }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(5e3),
        supabase.from("user_data").select("user_id, app_data, updated_at").limit(5e3)
      ]);
      if (pe) return jsonResponse5({ error: "Failed to fetch profiles" }, 500, corsHeaders);
      const udMap = {};
      (userData || []).forEach((r2) => {
        udMap[r2.user_id] = r2;
      });
      const users = (profiles || []).map((profile) => {
        const udRow = udMap[profile.id] || {};
        const parsed = parseAppData(udRow.app_data);
        return {
          id: profile.id,
          name: profile.full_name || profile.display_name || profile.name || "Unknown",
          email: profile.email || "",
          avatar: profile.avatar_url || null,
          registration_source: profile.registration_source || "unknown",
          created_at: profile.created_at,
          last_active: udRow.updated_at || profile.updated_at || profile.created_at,
          ...parsed
        };
      });
      return jsonResponse5({ success: true, users, total: users.length }, 200, corsHeaders);
    }
    if (action === "get_reading_stats") {
      const [{ data: profiles, error: pe }, { data: userData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, display_name, email, avatar_url, created_at, registration_source"),
        supabase.from("user_data").select("user_id, app_data, updated_at")
      ]);
      if (pe) return jsonResponse5({ error: "Failed to fetch profiles" }, 500, corsHeaders);
      const udMap = {};
      (userData || []).forEach((r2) => {
        udMap[r2.user_id] = r2;
      });
      const totalAyahsInQuran = 6236;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString();
      const users = (profiles || []).map((profile) => {
        const udRow = udMap[profile.id] || {};
        const parsed = parseAppData(udRow.app_data);
        const lastActive = udRow.updated_at || profile.updated_at || profile.created_at;
        return {
          id: profile.id,
          name: profile.full_name || profile.display_name || profile.email?.split("@")[0] || "Unknown",
          email: profile.email || "",
          avatar: profile.avatar_url,
          source: profile.registration_source || "unknown",
          created: profile.created_at,
          lastActive,
          ayahsRead: parsed.totalAyahsRead,
          currentSurah: parsed.currentSurah,
          currentAyah: parsed.currentAyah,
          bestStreak: parsed.bestStreak,
          readingGoal: parsed.readingGoal,
          surahsStarted: parsed.surahsStarted,
          surahsCompleted: parsed.surahsCompleted,
          bookmarksCount: parsed.bookmarksCount,
          activeDays30: parsed.activeDays30,
          activeDaysTotal: parsed.activeDaysTotal,
          reciter: parsed.reciter,
          dailyReminder: parsed.dailyReminder
        };
      });
      const readers = users.filter((u2) => (u2.ayahsRead || 0) > 0);
      const totalReaders = readers.length;
      const totalAyahsRead = readers.reduce((s2, u2) => s2 + (u2.ayahsRead || 0), 0);
      const avgProgress = totalReaders > 0 ? (totalAyahsRead / (totalReaders * totalAyahsInQuran) * 100).toFixed(1) : 0;
      const completedReaders = readers.filter((u2) => u2.ayahsRead >= totalAyahsInQuran).length;
      const activeReaders = users.filter((u2) => u2.lastActive > sevenDaysAgo).length;
      const ranges = [0, 10, 25, 50, 75, 90, 100];
      const distribution = ranges.slice(0, -1).map((r2, i2) => {
        const next = ranges[i2 + 1];
        return readers.filter((u2) => {
          const pct = (u2.ayahsRead || 0) / totalAyahsInQuran * 100;
          return pct >= r2 && pct < next;
        }).length;
      });
      return jsonResponse5({
        success: true,
        stats: { totalReaders, avgProgress: parseFloat(avgProgress), completedReaders, activeReaders, distribution },
        users: users.sort((a2, b) => b.ayahsRead - a2.ayahsRead).slice(0, 50)
      }, 200, corsHeaders);
    }
    if (action === "get_online_users") {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1e3).toISOString();
      const { data: sessions, error } = await supabase.from("user_sessions").select("user_id, platform, last_active_at").gt("last_active_at", tenMinAgo).order("last_active_at", { ascending: false });
      if (error) return jsonResponse5({ error: "Failed to fetch sessions" }, 500, corsHeaders);
      const seen = /* @__PURE__ */ new Set();
      const platforms = { ios: 0, android: 0, web: 0 };
      const topSessions = [];
      (sessions || []).forEach((s2) => {
        const p2 = (s2.platform || "").toLowerCase();
        if (p2 === "ios") platforms.ios++;
        else if (p2 === "android") platforms.android++;
        else platforms.web++;
        if (!seen.has(s2.user_id)) {
          seen.add(s2.user_id);
          topSessions.push(s2);
        }
      });
      const userIds = [...seen];
      let users = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, display_name, avatar_url, email").in("id", userIds);
        const profileMap = {};
        (profiles || []).forEach((p2) => {
          profileMap[p2.id] = p2;
        });
        users = topSessions.map((s2) => {
          const pr = profileMap[s2.user_id] || {};
          return {
            userId: s2.user_id,
            name: pr.full_name || pr.display_name || (pr.email || "").split("@")[0] || "Unknown",
            email: pr.email || "",
            avatar: pr.avatar_url || null,
            platform: s2.platform || "web",
            lastActiveAt: s2.last_active_at
          };
        });
      }
      return jsonResponse5({ success: true, count: seen.size, userIds, users, platforms }, 200, corsHeaders);
    }
    if (action === "delete_user") {
      if (role !== "super_admin")
        return jsonResponse5({ error: "Super Admin access required" }, 403, corsHeaders);
      const { userId } = body2;
      if (!userId || typeof userId !== "string")
        return jsonResponse5({ error: "userId is required" }, 400, corsHeaders);
      await supabase.from("user_data").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);
      return jsonResponse5({ success: true, message: "User deleted" }, 200, corsHeaders);
    }
    return jsonResponse5({ error: "Unknown action" }, 400, corsHeaders);
  } catch (error) {
    console.error("Admin users data error:", error);
    return jsonResponse5({ error: "Internal server error" }, 500, corsHeaders);
  }
}
function jsonResponse5(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
var SURAH_AYAHS;
var init_admin_users_data = __esm({
  "admin-users-data.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    SURAH_AYAHS = [
      0,
      7,
      286,
      200,
      176,
      120,
      165,
      206,
      75,
      129,
      109,
      123,
      111,
      43,
      52,
      99,
      128,
      111,
      110,
      98,
      135,
      112,
      78,
      118,
      64,
      77,
      227,
      93,
      88,
      69,
      60,
      34,
      30,
      73,
      54,
      45,
      83,
      182,
      88,
      75,
      85,
      54,
      53,
      89,
      59,
      37,
      35,
      38,
      29,
      18,
      45,
      60,
      49,
      62,
      55,
      78,
      96,
      29,
      22,
      24,
      13,
      14,
      11,
      11,
      18,
      12,
      12,
      30,
      52,
      52,
      44,
      28,
      28,
      20,
      56,
      40,
      31,
      50,
      40,
      46,
      42,
      29,
      19,
      36,
      25,
      22,
      17,
      19,
      26,
      30,
      20,
      15,
      21,
      11,
      8,
      8,
      19,
      5,
      8,
      8,
      11,
      11,
      8,
      3,
      9,
      5,
      4,
      7,
      3,
      6,
      3,
      5,
      4,
      5,
      6
    ];
    __name(parseAppData, "parseAppData");
    __name(onRequest14, "onRequest");
    __name(jsonResponse5, "jsonResponse");
  }
});

// app-error-report.js
async function onRequest15(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS7 });
  if (request.method !== "POST") return new Response('{"error":"POST only"}', { status: 405, headers: CORS7 });
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1e3;
  if (_recentIps.has(ip)) {
    const entry = _recentIps.get(ip);
    if (now - entry.start < windowMs && entry.count >= 30)
      return new Response('{"error":"rate_limit"}', { status: 429, headers: CORS7 });
    if (now - entry.start >= windowMs) _recentIps.set(ip, { start: now, count: 1 });
    else entry.count++;
  } else {
    _recentIps.set(ip, { start: now, count: 1 });
  }
  try {
    let san = function(v2, max) {
      if (v2 === null || v2 === void 0) return null;
      return String(v2).slice(0, max || 100);
    };
    __name(san, "san");
    const body2 = await request.json();
    if (!body2.error_type) return new Response('{"error":"error_type required"}', { status: 400, headers: CORS7 });
    const ipHash = await hashIp(ip);
    const row = {
      platform: san(body2.platform),
      app_version: san(body2.app_version),
      error_type: san(body2.error_type),
      error_message: san(body2.error_message, 500),
      stack_trace: san(body2.stack_trace, 2e3),
      page_context: san(body2.page_context),
      session_id: san(body2.session_id),
      ip_hash: ipHash
    };
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error } = await supabase.from("app_error_logs").insert(row);
    if (error) {
      console.error("[app-error-report] insert error:", error.message);
      return new Response('{"error":"db_error"}', { status: 500, headers: CORS7 });
    }
    return new Response('{"ok":true}', { status: 200, headers: CORS7 });
  } catch (e2) {
    return new Response('{"error":"bad_request"}', { status: 400, headers: CORS7 });
  }
}
async function hashIp(ip) {
  try {
    const data = new TextEncoder().encode(ip + "_tafsirkurd_salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e2) {
    return null;
  }
}
var CORS7, _recentIps;
var init_app_error_report = __esm({
  "app-error-report.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS7 = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    _recentIps = /* @__PURE__ */ new Map();
    __name(onRequest15, "onRequest");
    __name(hashIp, "hashIp");
  }
});

// app-translations.js
async function onRequest16(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") || "android";
  const allowedPlatforms = ["android", "ios", "web"];
  if (!allowedPlatforms.includes(platform)) {
    return new Response(JSON.stringify({ error: "Invalid platform" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const origin = request.headers.get("Origin") || "";
  const allowedDomains = ["tafsirkurd.com", "localhost", "127.0.0.1"];
  const isCapacitor = origin === "capacitor://localhost" || origin === "https://localhost";
  const referer = request.headers.get("Referer") || "";
  const isAllowed = allowedDomains.some((d2) => origin.includes(d2) || referer.includes(d2));
  if (!isAllowed && !isCapacitor) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    // 5-minute edge cache + 1-hour stale-while-revalidate.
    // Translations change rarely — a 5-min stale window is fine and prevents
    // the CF Worker from hitting Supabase on every i18n poll (every 30s).
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
    const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, "");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Config error" }), {
        status: 500,
        headers: corsHeaders
      });
    }
    const globalDeadline = new Promise(
      (_2, reject) => setTimeout(() => {
        const e2 = new Error("global_timeout");
        e2.name = "AbortError";
        reject(e2);
      }, 1e4)
    );
    const BATCH = 1e3;
    const dbHeaders = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` };
    const fetchAllRows = /* @__PURE__ */ __name(async () => {
      let rows2 = [];
      let offset = 0;
      while (true) {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4e3);
        let res;
        try {
          res = await fetch(
            `${supabaseUrl}/rest/v1/kurdish_translations?select=key_id,kurdish_text&limit=${BATCH}&offset=${offset}`,
            { headers: dbHeaders, signal: controller.signal }
          );
        } finally {
          clearTimeout(tid);
        }
        if (!res.ok) {
          const err = new Error("db_error");
          err.isDbError = true;
          throw err;
        }
        const batch = await res.json();
        rows2 = rows2.concat(batch);
        if (batch.length < BATCH) break;
        offset += BATCH;
      }
      return rows2;
    }, "fetchAllRows");
    const rows = await Promise.race([fetchAllRows(), globalDeadline]);
    const translations = {};
    for (const row of rows) {
      translations[row.key_id] = row.kurdish_text;
    }
    return new Response(JSON.stringify(translations), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    const isTimeout = error && error.name === "AbortError";
    const isDbError = error && error.isDbError;
    console.error("app-translations error:", isTimeout ? "timeout" : isDbError ? "DB error" : error);
    if (isDbError) {
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 502,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({ error: isTimeout ? "timeout" : "Internal error" }), {
      status: isTimeout ? 504 : 500,
      headers: corsHeaders
    });
  }
}
var init_app_translations = __esm({
  "app-translations.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest16, "onRequest");
  }
});

// app-version-report.js
async function onRequest17(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS8 });
  if (request.method !== "POST") return new Response('{"error":"POST only"}', { status: 405, headers: CORS8 });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1e3;
  if (_recentIps2.has(ip)) {
    const entry = _recentIps2.get(ip);
    if (now - entry.start < windowMs && entry.count >= 5)
      return new Response('{"ok":true}', { status: 200, headers: CORS8 });
    if (now - entry.start >= windowMs) _recentIps2.set(ip, { start: now, count: 1 });
    else entry.count++;
  } else {
    _recentIps2.set(ip, { start: now, count: 1 });
  }
  try {
    const body2 = await request.json();
    if (!body2.platform || !body2.build_number)
      return new Response('{"error":"platform and build_number required"}', { status: 400, headers: CORS8 });
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const key = String(body2.platform).slice(0, 20) + "_" + String(body2.build_number).slice(0, 20);
    const { error } = await supabase.from("app_version_stats").upsert({
      platform: String(body2.platform).slice(0, 20),
      build_number: String(body2.build_number).slice(0, 20),
      app_version: body2.app_version ? String(body2.app_version).slice(0, 30) : null,
      last_seen: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "platform,build_number" });
    if (error) console.error("[app-version-report]", error.message);
    return new Response('{"ok":true}', { status: 200, headers: CORS8 });
  } catch (e2) {
    return new Response('{"ok":true}', { status: 200, headers: CORS8 });
  }
}
var CORS8, _recentIps2;
var init_app_version_report = __esm({
  "app-version-report.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    CORS8 = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    _recentIps2 = /* @__PURE__ */ new Map();
    __name(onRequest17, "onRequest");
  }
});

// auto-notify.js
async function onRequest18(context) {
  const { request, env } = context;
  const auth = request.headers.get("Authorization") || "";
  const secret = env.NOTIF_CRON_SECRET || env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const baseUrl = new URL(request.url).origin;
  const res = await fetch(`${baseUrl}/admin-notifications-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": auth
    },
    body: JSON.stringify({ action: "auto_notify_content" })
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
var init_auto_notify = __esm({
  "auto-notify.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest18, "onRequest");
  }
});

// brevo-email-stats.js
async function onRequest19(context) {
  const { request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  try {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0
        },
        message: "Brevo integration not configured"
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Brevo stats error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        data: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 }
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}
var init_brevo_email_stats = __esm({
  "brevo-email-stats.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest19, "onRequest");
  }
});

// check-env.js
async function onRequest20(context) {
  const { env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Debug-Secret",
    "Content-Type": "application/json"
  };
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const debugSecret = env.DEBUG_SECRET;
  const providedSecret = context.request.headers.get("X-Debug-Secret");
  if (!debugSecret || providedSecret !== debugSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
    const analysis = {
      exists: !!serviceKey,
      length: serviceKey.length,
      startsWithEyJ: serviceKey.startsWith("eyJ"),
      hasSpacesAtStart: serviceKey.length > 0 && serviceKey[0] === " ",
      hasSpacesAtEnd: serviceKey.length > 0 && serviceKey[serviceKey.length - 1] === " ",
      hasNewlines: serviceKey.includes("\n") || serviceKey.includes("\r"),
      trimmedLength: serviceKey.trim().length,
      needsTrimming: serviceKey.trim().length !== serviceKey.length
    };
    return new Response(
      JSON.stringify({
        message: "Environment variable analysis",
        SUPABASE_SERVICE_ROLE_KEY: analysis,
        SUPABASE_URL: {
          exists: !!env.SUPABASE_URL
        },
        recommendation: analysis.needsTrimming ? "\u26A0\uFE0F Your service key has extra spaces or newlines! Copy it again from Supabase and paste carefully." : analysis.startsWithEyJ ? "\u2705 Key format looks correct!" : '\u274C Key does not start with "eyJ" - it may be incorrect.'
      }, null, 2),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Exception occurred",
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_check_env = __esm({
  "check-env.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest20, "onRequest");
  }
});

// config.js
async function onRequest21(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";
  const allowedDomains = ["tafsirkurd.com", "localhost", "127.0.0.1"];
  const isAllowed = allowedDomains.some((domain) => origin.includes(domain) || referer.includes(domain));
  const isCapacitor = origin === "capacitor://localhost" || origin === "https://localhost";
  const isDirectAccess = !origin && !referer && !request.headers.get("User-Agent")?.includes("Mozilla");
  if (isDirectAccess) {
    return new Response(
      JSON.stringify({ error: "Access denied" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  try {
    const cleanUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
    const cleanKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, "");
    const config = {
      supabaseUrl: cleanUrl,
      supabaseKey: cleanKey
    };
    try {
      const supabase = (await Promise.resolve().then(() => (init_module5(), module_exports))).createClient(
        cleanUrl,
        env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: rows } = await supabase.from("site_settings").select("key, value").in("key", [
        "prayer_cache_version",
        "i18n_cache_version",
        "i18n_health_reporting_enabled",
        "i18n_last_published_at"
      ]);
      if (rows) {
        const m2 = Object.fromEntries(rows.map((r2) => [r2.key, r2.value]));
        if (m2.prayer_cache_version) config.prayerCacheVersion = m2.prayer_cache_version;
        if (m2.i18n_cache_version) config.i18nCacheVersion = m2.i18n_cache_version;
        if (m2.i18n_health_reporting_enabled !== void 0)
          config.i18nHealthReportingEnabled = m2.i18n_health_reporting_enabled;
        if (m2.i18n_last_published_at) config.i18nLastPublishedAt = m2.i18n_last_published_at;
      }
    } catch (e2) {
    }
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify(config),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Config error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_config = __esm({
  "config.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest21, "onRequest");
  }
});

// cron-sync.js
async function onRequest22(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };
  const authHeader = request.headers.get("Authorization") || "";
  const cronSecret = env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: corsHeaders }
    );
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  const youtubeApiKey = env.YOUTUBE_API_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey || !youtubeApiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: corsHeaders }
    );
  }
  try {
    const seriesUrl = `${supabaseUrl}/rest/v1/islamvoice_series?youtube_playlist_id=not.is.null&select=id,name_ku,youtube_playlist_id,sync_excluded_video_ids,thumbnail_source,thumbnail_episode_num`;
    const seriesRes = await fetch(seriesUrl, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    });
    if (!seriesRes.ok) {
      throw new Error("Failed to fetch series");
    }
    const seriesList = await seriesRes.json();
    if (seriesList.length === 0) {
      return new Response(
        JSON.stringify({ synced: [], message: "No series with YouTube playlists found" }),
        { status: 200, headers: corsHeaders }
      );
    }
    const results = [];
    for (const series of seriesList) {
      try {
        const result = await syncSeries(
          series,
          supabaseUrl,
          supabaseServiceKey,
          youtubeApiKey
        );
        results.push(result);
      } catch (err) {
        results.push({
          seriesId: series.id,
          seriesName: series.name_ku,
          newEpisodes: 0,
          error: err.message
        });
      }
    }
    const totalNew = results.reduce((sum, r2) => sum + (r2.newEpisodes || 0), 0);
    console.log(`[CRON SYNC] ${(/* @__PURE__ */ new Date()).toISOString()} - Synced ${seriesList.length} series, ${totalNew} new episodes`);
    const _notifSecret = env.NOTIF_CRON_SECRET || env.CRON_SECRET;
    if (totalNew > 0 && _notifSecret) {
      const baseUrl = new URL(request.url).origin;
      fetch(`${baseUrl}/admin-notifications-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${_notifSecret}`
        },
        body: JSON.stringify({ action: "auto_notify_content" })
      }).catch(() => {
      });
    }
    return new Response(
      JSON.stringify({
        synced: results,
        totalNewEpisodes: totalNew,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: totalNew > 0 ? `Found ${totalNew} new episode${totalNew !== 1 ? "s" : ""}` : "All playlists are up to date"
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Cron sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
async function syncSeries(series, supabaseUrl, supabaseServiceKey, youtubeApiKey) {
  const {
    id: seriesId,
    name_ku: seriesName,
    youtube_playlist_id: playlistId,
    sync_excluded_video_ids,
    thumbnail_source,
    thumbnail_episode_num
  } = series;
  let excludedIds = [];
  try {
    excludedIds = JSON.parse(sync_excluded_video_ids || "[]");
  } catch (e2) {
  }
  const excludedSet = new Set(excludedIds);
  const youtubeVideos = await fetchAllPlaylistItems(playlistId, youtubeApiKey);
  if (youtubeVideos.length === 0) {
    return { seriesId, seriesName, newEpisodes: 0, message: "Empty playlist" };
  }
  const existingRes = await fetch(
    `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&select=video_url,episode_number`,
    {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    }
  );
  if (!existingRes.ok) {
    throw new Error("Failed to fetch existing episodes");
  }
  const existingEpisodes = await existingRes.json();
  const existingVideoIds = new Set(existingEpisodes.map((ep) => ep.video_url));
  const source = thumbnail_source || "first";
  if (source !== "manual") {
    let thumbnailQuery = `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&select=episode_number,thumbnail_url&order=episode_number`;
    if (source === "first") {
      thumbnailQuery += ".asc&limit=1";
    } else if (source === "last") {
      thumbnailQuery += ".desc&limit=1";
    } else if (source === "custom" && thumbnail_episode_num) {
      thumbnailQuery = `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&episode_number=eq.${thumbnail_episode_num}&select=thumbnail_url`;
    }
    const thumbRes = await fetch(thumbnailQuery, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    });
    if (thumbRes.ok) {
      const thumbData = await thumbRes.json();
      if (thumbData.length > 0 && thumbData[0].thumbnail_url) {
        await fetch(
          `${supabaseUrl}/rest/v1/islamvoice_series?id=eq.${seriesId}`,
          {
            method: "PATCH",
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({ thumbnail_url: thumbData[0].thumbnail_url })
          }
        );
      }
    }
  }
  const newVideos = youtubeVideos.filter((v2) => !existingVideoIds.has(v2.videoId) && !excludedSet.has(v2.videoId));
  if (newVideos.length === 0) {
    return { seriesId, seriesName, newEpisodes: 0, message: "Up to date" };
  }
  const durations = await fetchVideoDurations(newVideos.map((v2) => v2.videoId), youtubeApiKey);
  const maxEpisode = existingEpisodes.reduce((max, ep) => Math.max(max, ep.episode_number || 0), 0);
  const episodesToInsert = newVideos.map((video, index2) => ({
    series_id: seriesId,
    episode_number: maxEpisode + index2 + 1,
    title: video.title,
    description: video.description || null,
    video_url: video.videoId,
    thumbnail_url: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
    video_type: "youtube",
    duration: durations[video.videoId] || null,
    is_published: true
  }));
  const insertRes = await fetch(
    `${supabaseUrl}/rest/v1/islamvoice_episodes`,
    {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(episodesToInsert)
    }
  );
  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`Failed to insert episodes: ${errText}`);
  }
  return {
    seriesId,
    seriesName,
    newEpisodes: newVideos.length,
    episodes: newVideos.map((v2) => v2.title)
  };
}
async function fetchAllPlaylistItems(playlistId, apiKey) {
  const videos = [];
  let nextPageToken = "";
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
    const res = await fetch(url, {
      headers: { "Referer": "https://tafsirkurd.com/" }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`YouTube API error: ${errText}`);
    }
    const data = await res.json();
    for (const item of data.items || []) {
      const snippet = item.snippet;
      if (!snippet?.resourceId?.videoId) continue;
      if (snippet.title === "Deleted video" || snippet.title === "Private video") continue;
      videos.push({
        videoId: snippet.resourceId.videoId,
        title: snippet.title,
        description: snippet.description || "",
        thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.standard?.url || snippet.thumbnails?.medium?.url || "",
        position: snippet.position
      });
    }
    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);
  return videos;
}
async function fetchVideoDurations(videoIds, apiKey) {
  const durations = {};
  for (let i2 = 0; i2 < videoIds.length; i2 += 50) {
    const batchIds = videoIds.slice(i2, i2 + 50).join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`;
    const res = await fetch(url, {
      headers: { "Referer": "https://tafsirkurd.com/" }
    });
    if (!res.ok) continue;
    const data = await res.json();
    for (const item of data.items || []) {
      if (item.contentDetails?.duration) {
        durations[item.id] = parseISO8601Duration(item.contentDetails.duration);
      }
    }
  }
  return durations;
}
function parseISO8601Duration(iso8601) {
  const match2 = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match2) return null;
  return parseInt(match2[1] || 0) * 3600 + parseInt(match2[2] || 0) * 60 + parseInt(match2[3] || 0);
}
var init_cron_sync = __esm({
  "cron-sync.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest22, "onRequest");
    __name(syncSeries, "syncSeries");
    __name(fetchAllPlaylistItems, "fetchAllPlaylistItems");
    __name(fetchVideoDurations, "fetchVideoDurations");
    __name(parseISO8601Duration, "parseISO8601Duration");
  }
});

// delete-account.js
async function onRequest23(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: corsHeaders });
  }
  const authHeader = request.headers.get("Authorization") || "";
  const userToken = authHeader.replace("Bearer ", "").trim();
  if (!userToken) {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: corsHeaders });
  }
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "apikey": supabaseServiceKey,
      "Authorization": `Bearer ${userToken}`
    }
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: corsHeaders });
  }
  const user = await userRes.json();
  if (!user || !user.id) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
  }
  const userId = user.id;
  try {
    await Promise.allSettled([
      fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` }
      }),
      fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` }
      })
    ]);
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    });
    if (!deleteRes.ok) {
      const errBody = await deleteRes.json().catch(() => ({}));
      throw new Error(errBody.message || `Auth deletion failed: ${deleteRes.status}`);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (e2) {
    console.error("Delete account error:", e2);
    return new Response(JSON.stringify({ error: e2.message || "Account deletion failed" }), { status: 500, headers: corsHeaders });
  }
}
var init_delete_account = __esm({
  "delete-account.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest23, "onRequest");
  }
});

// device-fingerprint.js
async function onRequest24(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "";
  const ALLOWED_ORIGINS = ["https://tafsirkurd.com", "capacitor://localhost", "http://localhost"];
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://tafsirkurd.com";
  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  try {
    const deviceData = await request.json();
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    const SECRET_SALT = env.FINGERPRINT_SECRET;
    if (!SECRET_SALT) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: corsHeaders }
      );
    }
    const components = [
      SECRET_SALT,
      deviceData.screen || "",
      deviceData.timezone || "",
      deviceData.language || "",
      deviceData.platform || "",
      deviceData.cores || "",
      deviceData.memory || "",
      deviceData.touch || ""
    ];
    const fingerprintString = components.join("|");
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fingerprint = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
    return new Response(
      JSON.stringify({
        success: true,
        fingerprint
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Fingerprint generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate fingerprint" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_device_fingerprint = __esm({
  "device-fingerprint.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest24, "onRequest");
  }
});

// get-client-ip.js
async function onRequest25(context) {
  const { request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  try {
    const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || request.headers.get("X-Real-IP") || "0.0.0.0";
    return new Response(
      JSON.stringify({
        ip: clientIP,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Get client IP error:", error);
    return new Response(
      JSON.stringify({
        ip: "0.0.0.0",
        error: error.message
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}
var init_get_client_ip = __esm({
  "get-client-ip.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest25, "onRequest");
  }
});

// google-analytics.js
async function onRequest26(context) {
  const { env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authHeader = context.request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: corsHeaders });
  }
  const sessionRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${(/* @__PURE__ */ new Date()).toISOString()}&select=user_id`,
    { headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` } }
  );
  const sessions = sessionRes.ok ? await sessionRes.json() : [];
  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: corsHeaders });
  }
  try {
    const propertyId = env.GA_PROPERTY_ID;
    const serviceAccountEmail = env.GA_SERVICE_ACCOUNT_EMAIL;
    const privateKey = env.GA_PRIVATE_KEY;
    if (!propertyId || !serviceAccountEmail || !privateKey) {
      console.error("Missing GA credentials in environment variables");
      return new Response(JSON.stringify({
        error: "Google Analytics not configured",
        message: "Please set up GA_PROPERTY_ID, GA_SERVICE_ACCOUNT_EMAIL, and GA_PRIVATE_KEY in Cloudflare environment variables"
      }), { status: 500, headers: corsHeaders });
    }
    const url = new URL(context.request.url);
    const days = parseInt(url.searchParams.get("days")) || 30;
    const startDate = `${days}daysAgo`;
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    const [overviewData, pageData, deviceData, countryData, trafficData, sourceData, browserData] = await Promise.all([
      fetchOverviewMetrics(propertyId, accessToken, startDate),
      fetchPageMetrics(propertyId, accessToken, startDate),
      fetchDeviceMetrics(propertyId, accessToken, startDate),
      fetchCountryMetrics(propertyId, accessToken, startDate),
      fetchTrafficOverTime(propertyId, accessToken, startDate),
      fetchTrafficSources(propertyId, accessToken, startDate),
      fetchBrowserMetrics(propertyId, accessToken, startDate)
    ]);
    return new Response(JSON.stringify({
      success: true,
      overview: overviewData,
      pages: pageData,
      devices: deviceData,
      countries: countryData,
      trafficChart: trafficData,
      sources: sourceData,
      browsers: browserData,
      dateRange: { days, startDate, endDate: "today" },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching Google Analytics data:", error);
    return new Response(JSON.stringify({
      error: "Failed to fetch analytics data",
      message: error.message
    }), { status: 500, headers: corsHeaders });
  }
}
async function getAccessToken(email, privateKey) {
  const jwtHeader = {
    alg: "RS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const jwtClaim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const jwt = await createJWT(jwtHeader, jwtClaim, privateKey);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
async function createJWT(header, claim, privateKey) {
  const encoder = new TextEncoder();
  const base64UrlEncode = /* @__PURE__ */ __name((obj) => {
    const str = typeof obj === "string" ? obj : JSON.stringify(obj);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }, "base64UrlEncode");
  const headerEncoded = base64UrlEncode(header);
  const claimEncoded = base64UrlEncode(claim);
  const message = `${headerEncoded}.${claimEncoded}`;
  let keyData = privateKey;
  if (keyData.includes("\\n")) {
    keyData = keyData.replace(/\\n/g, "\n");
  }
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = keyData.substring(
    keyData.indexOf(pemHeader) + pemHeader.length,
    keyData.indexOf(pemFooter)
  ).replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c2) => c2.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(message)
  );
  const signatureEncoded = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
  return `${message}.${signatureEncoded}`;
}
async function fetchOverviewMetrics(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" }
        ]
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  const row = data.rows?.[0]?.metricValues || [];
  return {
    totalViews: parseInt(row[0]?.value || 0),
    uniqueVisitors: parseInt(row[1]?.value || 0),
    avgSessionDuration: parseFloat(row[2]?.value || 0),
    bounceRate: parseFloat(row[3]?.value || 0)
  };
}
async function fetchPageMetrics(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" }
        ],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 20
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.rows || []).map((row) => ({
    path: row.dimensionValues[0].value,
    title: row.dimensionValues[1].value,
    views: parseInt(row.metricValues[0].value),
    unique: parseInt(row.metricValues[1].value),
    avgTime: parseFloat(row.metricValues[2].value)
  }));
}
async function fetchDeviceMetrics(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }]
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  const devices = {};
  let total = 0;
  (data.rows || []).forEach((row) => {
    const device = row.dimensionValues[0].value.toLowerCase();
    const users = parseInt(row.metricValues[0].value);
    devices[device] = users;
    total += users;
  });
  return {
    mobile: total > 0 ? ((devices.mobile || 0) / total * 100).toFixed(1) : "0",
    desktop: total > 0 ? ((devices.desktop || 0) / total * 100).toFixed(1) : "0",
    tablet: total > 0 ? ((devices.tablet || 0) / total * 100).toFixed(1) : "0"
  };
}
async function fetchCountryMetrics(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.rows || []).map((row) => ({
    name: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value)
  }));
}
async function fetchTrafficOverTime(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.rows || []).map((row) => ({
    date: row.dimensionValues[0].value,
    views: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value)
  }));
}
async function fetchTrafficSources(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  const sources = (data.rows || []).map((row) => ({
    source: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value)
  }));
  const total = sources.reduce((sum, s2) => sum + s2.sessions, 0);
  return sources.map((s2) => ({
    ...s2,
    percentage: total > 0 ? (s2.sessions / total * 100).toFixed(1) : "0"
  }));
}
async function fetchBrowserMetrics(propertyId, accessToken, startDate = "30daysAgo") {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: [{ name: "browser" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10
      })
    }
  );
  if (!response.ok) {
    throw new Error(`GA API error: ${await response.text()}`);
  }
  const data = await response.json();
  const browsers = (data.rows || []).map((row) => ({
    browser: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value)
  }));
  const total = browsers.reduce((sum, b) => sum + b.users, 0);
  return browsers.map((b) => ({
    ...b,
    percentage: total > 0 ? (b.users / total * 100).toFixed(1) : "0"
  }));
}
var init_google_analytics = __esm({
  "google-analytics.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest26, "onRequest");
    __name(getAccessToken, "getAccessToken");
    __name(createJWT, "createJWT");
    __name(fetchOverviewMetrics, "fetchOverviewMetrics");
    __name(fetchPageMetrics, "fetchPageMetrics");
    __name(fetchDeviceMetrics, "fetchDeviceMetrics");
    __name(fetchCountryMetrics, "fetchCountryMetrics");
    __name(fetchTrafficOverTime, "fetchTrafficOverTime");
    __name(fetchTrafficSources, "fetchTrafficSources");
    __name(fetchBrowserMetrics, "fetchBrowserMetrics");
  }
});

// google-search-console.js
async function onRequest27(context) {
  const { request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  try {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalClicks: 0,
          totalImpressions: 0,
          averageCTR: 0,
          averagePosition: 0,
          rows: []
        },
        message: "Google Search Console integration not configured"
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Search Console error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        data: { totalClicks: 0, totalImpressions: 0, averageCTR: 0, averagePosition: 0, rows: [] }
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}
var init_google_search_console = __esm({
  "google-search-console.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest27, "onRequest");
  }
});

// i18n-health-report.js
async function onRequest28(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return new Response('{"error":"POST only"}', { status: 405, headers: corsHeaders });
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1e3;
  if (_recentIps3.has(ip)) {
    const entry = _recentIps3.get(ip);
    if (now - entry.start < windowMs && entry.count >= 20)
      return new Response('{"error":"rate_limit"}', { status: 429, headers: corsHeaders });
    if (now - entry.start >= windowMs) _recentIps3.set(ip, { start: now, count: 1 });
    else entry.count++;
  } else {
    _recentIps3.set(ip, { start: now, count: 1 });
  }
  try {
    let san = function(v2, maxLen) {
      if (v2 === null || v2 === void 0) return null;
      return String(v2).slice(0, maxLen || 100);
    };
    __name(san, "san");
    const body2 = await request.json();
    if (!body2.status || !body2.layer_used)
      return new Response('{"error":"missing required fields"}', { status: 400, headers: corsHeaders });
    const row = {
      platform: san(body2.platform),
      app_version: san(body2.app_version),
      layer_used: san(body2.layer_used),
      cache_version: san(body2.cache_version),
      key_count: typeof body2.key_count === "number" ? Math.min(body2.key_count, 9999) : null,
      status: san(body2.status),
      error_msg: san(body2.error_msg, 200),
      session_id: san(body2.session_id),
      bundled_loaded: body2.bundled_loaded === true || body2.bundled_loaded === false ? body2.bundled_loaded : null,
      rejected_count: typeof body2.rejected_count === "number" ? Math.min(body2.rejected_count, 999) : null,
      swap_count: typeof body2.swap_count === "number" ? Math.min(body2.swap_count, 999) : null,
      fetch_time_ms: typeof body2.fetch_time_ms === "number" ? Math.min(body2.fetch_time_ms, 99999) : null
    };
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error } = await supabase.from("i18n_cache_health").insert(row);
    if (error) {
      console.error("[i18n-health-report] insert error:", error.message);
      return new Response('{"error":"db_error"}', { status: 500, headers: corsHeaders });
    }
    return new Response('{"ok":true}', { status: 200, headers: corsHeaders });
  } catch (e2) {
    console.error("[i18n-health-report] error:", e2);
    return new Response('{"error":"bad_request"}', { status: 400, headers: corsHeaders });
  }
}
var _recentIps3;
var init_i18n_health_report = __esm({
  "i18n-health-report.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    _recentIps3 = /* @__PURE__ */ new Map();
    __name(onRequest28, "onRequest");
  }
});

// pdf-proxy.js
async function onRequest29(context) {
  const { request } = context;
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const pdfUrl = url.searchParams.get("url");
  if (!pdfUrl) {
    return new Response("Missing url param", { status: 400, headers: corsHeaders });
  }
  let parsed;
  try {
    parsed = new URL(pdfUrl);
  } catch (e2) {
    return new Response("Invalid URL", { status: 400, headers: corsHeaders });
  }
  if (!parsed.hostname.endsWith(ALLOWED_DOMAIN)) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }
  const resp3 = await fetch(pdfUrl, { method: request.method });
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", resp3.headers.get("Content-Type") || "application/pdf");
  const cl = resp3.headers.get("Content-Length");
  if (cl) headers.set("Content-Length", cl);
  return new Response(resp3.body, { status: resp3.status, headers });
}
var ALLOWED_DOMAIN;
var init_pdf_proxy = __esm({
  "pdf-proxy.js"() {
    init_functionsRoutes_0_6071133848472854();
    ALLOWED_DOMAIN = "r2.dev";
    __name(onRequest29, "onRequest");
  }
});

// popup-config.js
async function onRequest30(context) {
  const { env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    "Access-Control-Allow-Origin": "*"
  };
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  const fallback = { imageUrl: null };
  try {
    const base = (env.SUPABASE_URL || "").replace(/[\n\r\s]/g, "");
    const anonKey = (env.SUPABASE_ANON_KEY || "").replace(/[\n\r\s]/g, "");
    const url = base + "/rest/v1/site_settings?select=key,value&key=in.(" + KEYS.join(",") + ")";
    const res = await fetch(url, {
      headers: {
        "apikey": anonKey,
        "Authorization": "Bearer " + anonKey
      }
    });
    if (!res.ok) throw new Error("DB " + res.status);
    const data = await res.json();
    const map = {};
    if (Array.isArray(data)) data.forEach(function(r2) {
      map[r2.key] = r2.value;
    });
    const payload = {
      imageUrl: map["app_popup_image_url"] || null,
      imageMobileUrl: map["app_popup_image_mobile_url"] || null,
      footerVisible: map["footer_app_visible"] !== "false",
      footerName: map["footer_app_name"] || null,
      footerDesc: map["footer_app_desc"] || null,
      popupEnabled: map["popup_enabled"] !== "false",
      popupHeadline: map["popup_headline"] || null,
      popupSubtitle: map["popup_subtitle"] || null,
      iosUrl: map["app_store_url"] || null,
      playUrl: map["play_store_url"] || null
    };
    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch (e2) {
    return new Response(JSON.stringify(fallback), { status: 200, headers });
  }
}
var KEYS;
var init_popup_config = __esm({
  "popup-config.js"() {
    init_functionsRoutes_0_6071133848472854();
    KEYS = [
      "app_popup_image_url",
      "app_popup_image_mobile_url",
      "footer_app_visible",
      "footer_app_name",
      "footer_app_desc",
      "popup_enabled",
      "popup_headline",
      "popup_subtitle",
      "app_store_url",
      "play_store_url"
    ];
    __name(onRequest30, "onRequest");
  }
});

// prayer-health-report.js
async function onRequest31(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return new Response('{"error":"POST only"}', { status: 405, headers: corsHeaders });
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1e3;
  if (_recentIps4.has(ip)) {
    const entry = _recentIps4.get(ip);
    if (now - entry.start < windowMs && entry.count >= 20) {
      return new Response('{"error":"rate_limit"}', { status: 429, headers: corsHeaders });
    }
    if (now - entry.start >= windowMs) {
      _recentIps4.set(ip, { start: now, count: 1 });
    } else {
      entry.count++;
    }
  } else {
    _recentIps4.set(ip, { start: now, count: 1 });
  }
  try {
    let san = function(v2) {
      if (v2 === null || v2 === void 0) return null;
      return String(v2).slice(0, 100);
    };
    __name(san, "san");
    const body2 = await request.json();
    if (!body2.city || !body2.baghdad_date || !body2.cache_status) {
      return new Response('{"error":"missing required fields"}', { status: 400, headers: corsHeaders });
    }
    const row = {
      session_id: san(body2.session_id),
      platform: san(body2.platform),
      city: san(body2.city),
      baghdad_date: san(body2.baghdad_date),
      cache_status: san(body2.cache_status),
      stale_reason: san(body2.stale_reason),
      cache_age_hours: typeof body2.cache_age_hours === "number" ? body2.cache_age_hours : null,
      cache_version: san(body2.cache_version),
      fajr_shown: san(body2.fajr_shown),
      dhuhr_shown: san(body2.dhuhr_shown),
      maghrib_shown: san(body2.maghrib_shown),
      isha_shown: san(body2.isha_shown),
      notifications_rescheduled: body2.notifications_rescheduled === true,
      changed_from: san(body2.changed_from),
      error_msg: san(body2.error_msg)
    };
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error } = await supabase.from("prayer_cache_health").insert(row);
    if (error) {
      console.error("[prayer-health-report] insert error:", error.message);
      return new Response('{"error":"db_error"}', { status: 500, headers: corsHeaders });
    }
    return new Response('{"ok":true}', { status: 200, headers: corsHeaders });
  } catch (e2) {
    console.error("[prayer-health-report] error:", e2);
    return new Response('{"error":"bad_request"}', { status: 400, headers: corsHeaders });
  }
}
var _recentIps4;
var init_prayer_health_report = __esm({
  "prayer-health-report.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    _recentIps4 = /* @__PURE__ */ new Map();
    __name(onRequest31, "onRequest");
  }
});

// prayer-kurd.js
async function onRequest32(context) {
  try {
    const { request } = context;
    if (request.method === "OPTIONS") return resp2(null, 204);
    const url = new URL(request.url);
    const city = url.searchParams.get("city") || "";
    const month = parseInt(url.searchParams.get("month") || "0");
    const year = parseInt(url.searchParams.get("year") || "0");
    const cityPath = CITY_URL[city];
    if (!cityPath || month < 1 || month > 12 || !year) {
      return resp2({ error: "Invalid params" }, 400);
    }
    const pageUrl = "https://amozhgary.tv/bang/" + cityPath + "?month=" + month;
    const res = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return resp2({ error: "upstream " + res.status }, 502);
    const html = await res.text();
    const days = parseMonthlyTimes(html);
    return resp2({ city, year, month, days });
  } catch (e2) {
    return resp2({ error: String(e2) }, 500);
  }
}
function parseMonthlyTimes(html) {
  const days = {};
  const dateRe = /(\d{1,2})\s*-\s*[\u0600-\u06FF][^\-<]+-\s*\d{4}/g;
  let m2;
  while ((m2 = dateRe.exec(html)) !== null) {
    const gregDay = parseInt(m2[1]);
    const pos = m2.index;
    const after = html.slice(pos + m2[0].length, pos + m2[0].length + 1500);
    const raw = [];
    const tRe = />(\d{2}:\d{2})</g;
    let tm;
    while ((tm = tRe.exec(after)) !== null && raw.length < 6) raw.push(tm[1]);
    if (raw.length === 6) {
      const t2 = to24h(raw);
      days[gregDay] = { Fajr: t2[0], Sunrise: t2[1], Dhuhr: t2[2], Asr: t2[3], Maghrib: t2[4], Isha: t2[5] };
      const before = html.slice(Math.max(0, pos - 500), pos);
      const hm = before.match(/(\d{1,2})\u06CC\s*([\u0600-\u06FF]+)\s*(\d{4})/);
      if (hm) days[gregDay].hijri = hm[1] + "\u06CC " + hm[2] + " " + hm[3];
    }
  }
  return days;
}
function to24h(times) {
  const out = [];
  let prev = 0;
  for (const t2 of times) {
    const p2 = t2.split(":");
    let h2 = parseInt(p2[0]);
    const mi = parseInt(p2[1]);
    let mins = h2 * 60 + mi;
    if (h2 < 12 && mins < prev) {
      h2 += 12;
      mins += 720;
    }
    prev = mins;
    out.push((h2 < 10 ? "0" : "") + h2 + ":" + (mi < 10 ? "0" : "") + mi);
  }
  return out;
}
function resp2(data, status) {
  return new Response(data == null ? "" : JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
var CITY_URL;
var init_prayer_kurd = __esm({
  "prayer-kurd.js"() {
    init_functionsRoutes_0_6071133848472854();
    CITY_URL = {
      Sulaymaniyah: "%D8%B3%D9%84%DB%8E%D9%85%D8%A7%D9%86%DB%8C",
      Erbil: "%D9%87%DB%95%D9%88%D9%84%DB%8E%D8%B1",
      Duhok: "%D8%AF%D9%87%DB%86%DA%A9",
      Kirkuk: "%DA%A9%DB%95%D8%B1%DA%A9%D9%88%DA%A9",
      Halabja: "%D9%87%DB%95%DA%B5%DB%95%D8%A8%D8%AC%DB%95",
      Kfry: "%DA%A9%D9%81%D8%B1%DB%8C",
      Rania: "%DA%95%D8%A7%D9%86%DB%8C%DB%95",
      Koya: "%DA%A9%DB%86%DB%8C%DB%95",
      Qaladze: "%D9%82%DB%95%DA%B5%D8%A7%D8%AF%D8%B2%DB%8E",
      Zakho: "%D8%B2%D8%A7%D8%AE%DB%86",
      Bardarash: "%D8%A8%DB%95%D8%B1%D8%AF%DB%95%DA%95%DB%95%D8%B4",
      Mosul: "%D9%85%D9%88%D8%B3%D9%84%D8%B5",
      Darbandikhan: "%D8%AF%DB%95%D8%B1%D8%A8%DB%95%D9%86%D8%AF%DB%8C%D8%AE%D8%A7%D9%86",
      Kalar: "%DA%A9%DB%95%D9%84%D8%A7%D8%B1",
      Akre: "%D8%A6%D8%A7%DA%A9%D8%B1%DB%8C",
      Daquq: "%D8%AF%D8%A7%D9%82%D9%88%D9%82",
      Makhmur: "%D9%85%DB%95%D8%AE%D9%85%D9%88%D8%B1",
      Mandali: "%D9%85%DB%95%D9%86%D8%AF%DB%95%D9%84%DB%8C",
      Qarahanjir: "%D9%82%DB%95%D8%B1%DB%95%D9%87%DB%95%D9%86%D8%AC%DB%8C%D8%B1",
      DuzKhormatou: "%D8%AF%D9%88%D8%B2%20%D8%AE%D9%88%D8%B1%D9%85%D8%A7%D8%AA%D9%88%D9%88"
    };
    __name(onRequest32, "onRequest");
    __name(parseMonthlyTimes, "parseMonthlyTimes");
    __name(to24h, "to24h");
    __name(resp2, "resp");
  }
});

// push-notifications.js
async function onRequest33(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS9 });
  if (request.method !== "POST") return json7({ error: "Method not allowed" }, 405);
  const secret = request.headers.get("X-Push-Secret") || "";
  if (!env.PUSH_SECRET || secret !== env.PUSH_SECRET) {
    return json7({ error: "Unauthorized" }, 401);
  }
  const { title, body: body2, data = {}, platform } = await request.json().catch(() => ({}));
  if (!title || !body2) return json7({ error: "title and body are required" }, 400);
  if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) {
    return json7({ error: "FCM not configured \u2014 set FCM_SERVICE_ACCOUNT and FCM_PROJECT_ID secrets" }, 503);
  }
  let tokens;
  try {
    tokens = await getTokens(env, platform);
  } catch (e2) {
    return json7({ error: "DB error: " + e2.message }, 500);
  }
  if (!tokens.length) return json7({ sent: 0, message: "No registered tokens" });
  let accessToken;
  try {
    accessToken = await getFCMAccessToken2(env.FCM_SERVICE_ACCOUNT);
  } catch (e2) {
    return json7({ error: "FCM auth error: " + e2.message }, 500);
  }
  const staleTokens = [];
  let successCount = 0;
  const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
  await Promise.allSettled(tokens.map(async ({ token, row_platform }) => {
    const message = buildMessage(token, row_platform, title, body2, data);
    const res = await fetch(FCM_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    if (res.ok) {
      successCount++;
    } else {
      const err = await res.json().catch(() => ({}));
      if (err?.error?.status === "NOT_FOUND" || err?.error?.status === "UNREGISTERED") {
        staleTokens.push(token);
      }
    }
  }));
  if (staleTokens.length) {
    await removeStaleTokens2(env, staleTokens).catch(() => {
    });
  }
  return json7({ sent: successCount, total: tokens.length, stale_removed: staleTokens.length }, 200);
}
function json7(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS9 });
}
async function getTokens(env, platform) {
  let url = `${env.SUPABASE_URL}/rest/v1/push_tokens?select=token,platform`;
  if (platform === "android" || platform === "ios") url += `&platform=eq.${platform}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = await res.json();
  return rows.map((r2) => ({ token: r2.token, row_platform: r2.platform }));
}
async function removeStaleTokens2(env, tokens) {
  const inList = tokens.map((t2) => `"${t2}"`).join(",");
  await fetch(`${env.SUPABASE_URL}/rest/v1/push_tokens?token=in.(${inList})`, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal"
    }
  });
}
function buildMessage(token, platform, title, body2, data) {
  const base = {
    token,
    notification: { title, body: body2 },
    data: Object.fromEntries(Object.entries(data).map(([k, v2]) => [k, String(v2)]))
  };
  if (platform === "android") {
    base.android = {
      priority: "high",
      notification: { icon: "ic_notification", color: "#1f5f4a" }
    };
  } else if (platform === "ios") {
    base.apns = {
      payload: { aps: { badge: 1, sound: "default" } }
    };
  }
  return base;
}
async function getFCMAccessToken2(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1e3);
  const headerB64 = b64url2(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimB64 = b64url2(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const sigInput = `${headerB64}.${claimB64}`;
  const privateKey = await importRSAKey2(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(sigInput));
  const jwt = `${sigInput}.${b64urlRaw2(sig)}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(JSON.stringify(tokenData));
  return tokenData.access_token;
}
function b64url2(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64urlRaw2(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function pemToDer2(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i2 = 0; i2 < bin.length; i2++) buf[i2] = bin.charCodeAt(i2);
  return buf.buffer;
}
async function importRSAKey2(pemKey) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToDer2(pemKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}
var CORS9;
var init_push_notifications = __esm({
  "push-notifications.js"() {
    init_functionsRoutes_0_6071133848472854();
    CORS9 = {
      "Access-Control-Allow-Origin": "https://tafsirkurd.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Push-Secret",
      "Content-Type": "application/json"
    };
    __name(onRequest33, "onRequest");
    __name(json7, "json");
    __name(getTokens, "getTokens");
    __name(removeStaleTokens2, "removeStaleTokens");
    __name(buildMessage, "buildMessage");
    __name(getFCMAccessToken2, "getFCMAccessToken");
    __name(b64url2, "b64url");
    __name(b64urlRaw2, "b64urlRaw");
    __name(pemToDer2, "pemToDer");
    __name(importRSAKey2, "importRSAKey");
  }
});

// register-push-token.js
async function onRequest34(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS10 });
  if (request.method !== "POST") return json8({ error: "POST only" }, 405);
  let body2;
  try {
    body2 = await request.json();
  } catch {
    return json8({ error: "Invalid JSON" }, 400);
  }
  const { token, platform } = body2 || {};
  if (!token || typeof token !== "string" || token.length < 32)
    return json8({ error: "Invalid token" }, 400);
  if (!platform || !["ios", "android"].includes(platform))
    return json8({ error: "platform must be ios or android" }, 400);
  const url = `${env.SUPABASE_URL}/rest/v1/push_tokens`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      token,
      platform,
      user_id: null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return json8({ error: "DB error: " + err }, 500);
  }
  return json8({ success: true });
}
function json8(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS10 });
}
var CORS10;
var init_register_push_token = __esm({
  "register-push-token.js"() {
    init_functionsRoutes_0_6071133848472854();
    CORS10 = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    __name(onRequest34, "onRequest");
    __name(json8, "json");
  }
});

// s3-upload.js
async function onRequest35(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  try {
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("multipart/form-data")) {
      return await handleProxyUpload(request, env, corsHeaders);
    }
    const body2 = await request.json();
    const { filename, contentType, folder = "videos", bucket: bucketOverride } = body2;
    if (!filename || !contentType) {
      return new Response(
        JSON.stringify({ error: "Missing filename or contentType" }),
        { status: 400, headers: corsHeaders }
      );
    }
    const adminToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!adminToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }
    const isValidAdmin = await verifyAdminToken(adminToken, env);
    if (!isValidAdmin) {
      return new Response(
        JSON.stringify({ error: "Invalid admin token" }),
        { status: 401, headers: corsHeaders }
      );
    }
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${timestamp}-${sanitizedFilename}`;
    const useR2 = env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY;
    let presignedUrl, publicUrl;
    if (useR2) {
      const accessKeyId = env.R2_ACCESS_KEY_ID;
      const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
      const accountId = env.CF_ACCOUNT_ID;
      const bucket = bucketOverride || env.R2_BUCKET || "tafsirkurd-videos";
      const publicDomain = bucket === "tafsirkurd-books" ? env.R2_BOOKS_PUBLIC_DOMAIN || env.R2_PUBLIC_DOMAIN : env.R2_PUBLIC_DOMAIN;
      if (!accessKeyId || !secretAccessKey || !accountId) {
        console.error("Missing R2 credentials");
        return new Response(
          JSON.stringify({ error: "Server configuration error - R2 credentials missing" }),
          { status: 500, headers: corsHeaders }
        );
      }
      presignedUrl = await generateR2PresignedUrl({
        accessKeyId,
        secretAccessKey,
        accountId,
        bucket,
        key,
        contentType,
        expiresIn: 3600
      });
      publicUrl = publicDomain ? `https://${publicDomain}/${key}` : `https://pub-${accountId}.r2.dev/${bucket}/${key}`;
    } else {
      const accessKeyId = env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
      const bucket = env.AWS_S3_BUCKET;
      const region = env.AWS_S3_REGION || "eu-north-1";
      if (!accessKeyId || !secretAccessKey || !bucket) {
        console.error("Missing AWS credentials");
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          { status: 500, headers: corsHeaders }
        );
      }
      presignedUrl = await generateS3PresignedUrl({
        accessKeyId,
        secretAccessKey,
        bucket,
        region,
        key,
        contentType,
        expiresIn: 3600
      });
      const cloudfrontDomain = env.AWS_CLOUDFRONT_DOMAIN;
      publicUrl = cloudfrontDomain ? `https://${cloudfrontDomain}/${key}` : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl: presignedUrl,
        publicUrl,
        key,
        storage: useR2 ? "r2" : "s3"
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
async function handleProxyUpload(request, env, corsHeaders) {
  const adminToken = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!adminToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const isValid = await verifyAdminToken(adminToken, env);
  if (!isValid) {
    return new Response(JSON.stringify({ error: "Invalid admin token" }), { status: 401, headers: corsHeaders });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder") || "uploads";
  const bucketName = formData.get("bucket") || env.R2_BUCKET || "tafsirkurd-videos";
  if (!file || typeof file === "string") {
    return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: corsHeaders });
  }
  const ext = file.name.split(".").pop().toLowerCase();
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const contentType = file.type || "application/octet-stream";
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const accountId = env.CF_ACCOUNT_ID;
  if (!accessKeyId || !secretAccessKey || !accountId) {
    return new Response(JSON.stringify({ error: "R2 credentials missing" }), { status: 500, headers: corsHeaders });
  }
  const presignedUrl = await generateR2PresignedUrl({
    accessKeyId,
    secretAccessKey,
    accountId,
    bucket: bucketName,
    key,
    contentType,
    expiresIn: 300
  });
  const fileBuffer = await file.arrayBuffer();
  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBuffer
  });
  if (!putRes.ok) {
    const errText = await putRes.text();
    console.error("R2 PUT failed:", putRes.status, errText);
    return new Response(JSON.stringify({ error: "R2 upload failed: " + putRes.status }), { status: 502, headers: corsHeaders });
  }
  const publicDomain = bucketName === "tafsirkurd-books" ? env.R2_BOOKS_PUBLIC_DOMAIN || env.R2_PUBLIC_DOMAIN : env.R2_PUBLIC_DOMAIN;
  const publicUrl = publicDomain ? `https://${publicDomain}/${key}` : `https://pub-${accountId}.r2.dev/${key}`;
  return new Response(JSON.stringify({ success: true, publicUrl, key }), { status: 200, headers: corsHeaders });
}
async function verifyAdminToken(token, env) {
  try {
    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return false;
    }
    const url = `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&select=id,expires_at,user_id`;
    const response = await fetch(url, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) return false;
    const sessions = await response.json();
    if (!sessions || sessions.length === 0) return false;
    const session = sessions[0];
    if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) return false;
    return true;
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}
async function generateR2PresignedUrl({ accessKeyId, secretAccessKey, accountId, bucket, key, contentType, expiresIn }) {
  const service = "s3";
  const region = "auto";
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${bucket}/${key}`;
  const now = /* @__PURE__ */ new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expiresIn.toString(),
    "X-Amz-SignedHeaders": "content-type;host"
  });
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQueryString = params.toString().split("&").sort().join("&");
  const canonicalHeaders = `content-type:${contentType}
host:${host}
`;
  const signedHeaders = "content-type;host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex2(canonicalRequest);
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join("\n");
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  params.set("X-Amz-Signature", signature);
  return `${endpoint}?${params.toString()}`;
}
async function generateS3PresignedUrl({ accessKeyId, secretAccessKey, bucket, region, key, contentType, expiresIn }) {
  const service = "s3";
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}/${key}`;
  const now = /* @__PURE__ */ new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expiresIn.toString(),
    "X-Amz-SignedHeaders": "content-type;host"
  });
  const canonicalUri = "/" + key;
  const canonicalQueryString = params.toString().split("&").sort().join("&");
  const canonicalHeaders = `content-type:${contentType}
host:${host}
`;
  const signedHeaders = "content-type;host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex2(canonicalRequest);
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join("\n");
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  params.set("X-Amz-Signature", signature);
  return `${endpoint}?${params.toString()}`;
}
async function sha256Hex2(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}
async function hmacHex(key, message) {
  const sig = await hmac(key, message);
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = await hmac("AWS4" + secretKey, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}
var init_s3_upload = __esm({
  "s3-upload.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest35, "onRequest");
    __name(handleProxyUpload, "handleProxyUpload");
    __name(verifyAdminToken, "verifyAdminToken");
    __name(generateR2PresignedUrl, "generateR2PresignedUrl");
    __name(generateS3PresignedUrl, "generateS3PresignedUrl");
    __name(sha256Hex2, "sha256Hex");
    __name(hmac, "hmac");
    __name(hmacHex, "hmacHex");
    __name(getSignatureKey, "getSignatureKey");
  }
});

// search-console.js
async function onRequest36(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: corsHeaders });
  }
  const sessionRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${(/* @__PURE__ */ new Date()).toISOString()}&select=user_id`,
    { headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` } }
  );
  const sessions = sessionRes.ok ? await sessionRes.json() : [];
  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: corsHeaders });
  }
  try {
    const { action, dateRange } = await request.json();
    let credentials;
    if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
      credentials = {
        client_email: env.GOOGLE_CLIENT_EMAIL,
        private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      };
    } else if (env.GOOGLE_SERVICE_ACCOUNT) {
      const rawCreds = env.GOOGLE_SERVICE_ACCOUNT;
      try {
        let decoded;
        try {
          decoded = atob(rawCreds);
        } catch (e2) {
          decoded = rawCreds;
        }
        decoded = decoded.replace(/\r\n/g, "\\n").replace(/\n/g, "\\n").replace(/\r/g, "\\n");
        credentials = JSON.parse(decoded);
      } catch (parseError) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials format: " + parseError.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Google credentials not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables." }),
        { status: 500, headers: corsHeaders }
      );
    }
    if (!credentials.client_email || !credentials.private_key) {
      return new Response(
        JSON.stringify({ error: "Google credentials not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }
    const accessToken = await getGoogleAccessToken(credentials);
    const siteUrl = "https://tafsirkurd.com/";
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(endDate.getDate() - 1);
    let startDate = /* @__PURE__ */ new Date();
    switch (dateRange) {
      case "24hours":
        startDate.setDate(startDate.getDate() - 2);
        break;
      case "7days":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "3months":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "28days":
      default:
        startDate.setDate(startDate.getDate() - 28);
    }
    const formatDate = /* @__PURE__ */ __name((d2) => d2.toISOString().split("T")[0], "formatDate");
    if (action === "performance") {
      const [totals, queries, pages, countries, devices, daily] = await Promise.all([
        // Total metrics
        fetchSearchAnalytics(accessToken, siteUrl, {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: [],
          rowLimit: 1
        }),
        // Top queries
        fetchSearchAnalytics(accessToken, siteUrl, {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["query"],
          rowLimit: 20
        }),
        // Top pages
        fetchSearchAnalytics(accessToken, siteUrl, {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["page"],
          rowLimit: 20
        }),
        // Countries
        fetchSearchAnalytics(accessToken, siteUrl, {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["country"],
          rowLimit: 20
        }),
        // Devices
        fetchSearchAnalytics(accessToken, siteUrl, {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["device"],
          rowLimit: 10
        }),
        // Daily data for chart
        fetchSearchAnalytics(accessToken, siteUrl, {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["date"],
          rowLimit: 100
        })
      ]);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            totals: totals.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
            queries: queries.rows || [],
            pages: pages.rows || [],
            countries: countries.rows || [],
            devices: devices.rows || [],
            daily: daily.rows || [],
            dateRange: { start: formatDate(startDate), end: formatDate(endDate) }
          }
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    if (action === "sitemaps") {
      const sitemaps = await fetchSitemaps(accessToken, siteUrl);
      return new Response(
        JSON.stringify({ success: true, data: sitemaps }),
        { status: 200, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Search Console API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
async function getGoogleAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const jwt = await createJWT2(header, payload, credentials.private_key);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}
async function createJWT2(header, payload, privateKey) {
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signInput = `${headerB64}.${payloadB64}`;
  const pemContents = privateKey.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c2) => c2.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${signInput}.${signatureB64}`;
}
async function fetchSearchAnalytics(accessToken, siteUrl, options) {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions,
        rowLimit: options.rowLimit || 25,
        dataState: "final"
      })
    }
  );
  if (!response.ok) {
    const error = await response.text();
    console.error("Search Analytics error:", error);
    return { rows: [] };
  }
  return response.json();
}
async function fetchSitemaps(accessToken, siteUrl) {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
    {
      headers: { "Authorization": `Bearer ${accessToken}` }
    }
  );
  if (!response.ok) {
    return { sitemap: [] };
  }
  return response.json();
}
var init_search_console = __esm({
  "search-console.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest36, "onRequest");
    __name(getGoogleAccessToken, "getGoogleAccessToken");
    __name(createJWT2, "createJWT");
    __name(fetchSearchAnalytics, "fetchSearchAnalytics");
    __name(fetchSitemaps, "fetchSitemaps");
  }
});

// send-bulk-email.js
async function onRequest37(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 503, headers: corsHeaders });
  }
  const sessionRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${(/* @__PURE__ */ new Date()).toISOString()}&select=user_id`,
    { headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` } }
  );
  const sessions = sessionRes.ok ? await sessionRes.json() : [];
  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: corsHeaders });
  }
  try {
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }
    const { recipients, subject, htmlContent } = data;
    if (!Array.isArray(recipients) || !subject || !htmlContent) {
      return new Response(JSON.stringify({ error: "recipients (array), subject, and htmlContent are required" }), { status: 400, headers: corsHeaders });
    }
    if (!env.BREVO_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Brevo API not configured"
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({ success: false, message: "Bulk email sending not yet implemented" }),
      { status: 501, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Bulk email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_send_bulk_email = __esm({
  "send-bulk-email.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest37, "onRequest");
  }
});

// send-email-notification.js
async function onRequest38(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 503, headers: corsHeaders });
  }
  const sessionRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${(/* @__PURE__ */ new Date()).toISOString()}&select=user_id`,
    { headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` } }
  );
  const sessions = sessionRes.ok ? await sessionRes.json() : [];
  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: corsHeaders });
  }
  try {
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }
    const { to, subject, htmlContent } = data;
    if (!to || !subject || !htmlContent) {
      return new Response(JSON.stringify({ error: "to, subject, and htmlContent are required" }), { status: 400, headers: corsHeaders });
    }
    if (!env.BREVO_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Brevo API not configured"
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({ success: false, message: "Email sending not yet implemented" }),
      { status: 501, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Email notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_send_email_notification = __esm({
  "send-email-notification.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest38, "onRequest");
  }
});

// sync-playlists.js
async function onRequest39(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: corsHeaders }
    );
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  const youtubeApiKey = env.YOUTUBE_API_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: corsHeaders }
    );
  }
  if (!youtubeApiKey) {
    return new Response(
      JSON.stringify({ error: "YouTube API key not configured" }),
      { status: 500, headers: corsHeaders }
    );
  }
  try {
    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${(/* @__PURE__ */ new Date()).toISOString()}&select=user_id`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`
        }
      }
    );
    if (!sessionRes.ok) {
      return new Response(
        JSON.stringify({ error: "Auth verification failed" }),
        { status: 500, headers: corsHeaders }
      );
    }
    const sessions = await sessionRes.json();
    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: corsHeaders }
      );
    }
    let body2 = {};
    try {
      body2 = await request.json();
    } catch (e2) {
    }
    const targetSeriesId = body2.seriesId || null;
    let seriesUrl = `${supabaseUrl}/rest/v1/islamvoice_series?youtube_playlist_id=not.is.null&select=id,name_ku,youtube_playlist_id,sync_excluded_video_ids,thumbnail_source,thumbnail_episode_num`;
    if (targetSeriesId) {
      seriesUrl = `${supabaseUrl}/rest/v1/islamvoice_series?id=eq.${targetSeriesId}&youtube_playlist_id=not.is.null&select=id,name_ku,youtube_playlist_id,sync_excluded_video_ids,thumbnail_source,thumbnail_episode_num`;
    }
    const seriesRes = await fetch(seriesUrl, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    });
    if (!seriesRes.ok) {
      throw new Error("Failed to fetch series");
    }
    const seriesList = await seriesRes.json();
    if (seriesList.length === 0) {
      return new Response(
        JSON.stringify({ synced: [], message: "No series with YouTube playlists found" }),
        { status: 200, headers: corsHeaders }
      );
    }
    const results = [];
    for (const series of seriesList) {
      try {
        const result = await syncSeries2(
          series,
          supabaseUrl,
          supabaseServiceKey,
          youtubeApiKey
        );
        results.push(result);
      } catch (err) {
        results.push({
          seriesId: series.id,
          seriesName: series.name_ku,
          newEpisodes: 0,
          error: err.message
        });
      }
    }
    const totalNew = results.reduce((sum, r2) => sum + (r2.newEpisodes || 0), 0);
    return new Response(
      JSON.stringify({
        synced: results,
        totalNewEpisodes: totalNew,
        message: totalNew > 0 ? `Found ${totalNew} new episode${totalNew !== 1 ? "s" : ""}` : "All playlists are up to date"
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Sync playlists error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
async function syncSeries2(series, supabaseUrl, supabaseServiceKey, youtubeApiKey) {
  const {
    id: seriesId,
    name_ku: seriesName,
    youtube_playlist_id: playlistId,
    sync_excluded_video_ids,
    thumbnail_source,
    thumbnail_episode_num
  } = series;
  let excludedIds = [];
  try {
    excludedIds = JSON.parse(sync_excluded_video_ids || "[]");
  } catch (e2) {
  }
  const excludedSet = new Set(excludedIds);
  const youtubeVideos = await fetchAllPlaylistItems2(playlistId, youtubeApiKey);
  if (youtubeVideos.length === 0) {
    return { seriesId, seriesName, newEpisodes: 0, message: "Empty playlist" };
  }
  const existingRes = await fetch(
    `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&select=video_url,episode_number`,
    {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    }
  );
  if (!existingRes.ok) {
    throw new Error("Failed to fetch existing episodes");
  }
  const existingEpisodes = await existingRes.json();
  const existingVideoIds = new Set(existingEpisodes.map((ep) => ep.video_url));
  const source = thumbnail_source || "first";
  if (source !== "manual") {
    let thumbnailQuery = `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&select=episode_number,thumbnail_url&order=episode_number`;
    if (source === "first") {
      thumbnailQuery += ".asc&limit=1";
    } else if (source === "last") {
      thumbnailQuery += ".desc&limit=1";
    } else if (source === "custom" && thumbnail_episode_num) {
      thumbnailQuery = `${supabaseUrl}/rest/v1/islamvoice_episodes?series_id=eq.${seriesId}&episode_number=eq.${thumbnail_episode_num}&select=thumbnail_url`;
    }
    const thumbRes = await fetch(thumbnailQuery, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`
      }
    });
    if (thumbRes.ok) {
      const thumbData = await thumbRes.json();
      if (thumbData.length > 0 && thumbData[0].thumbnail_url) {
        await fetch(
          `${supabaseUrl}/rest/v1/islamvoice_series?id=eq.${seriesId}`,
          {
            method: "PATCH",
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({ thumbnail_url: thumbData[0].thumbnail_url })
          }
        );
      }
    }
  }
  const newVideos = youtubeVideos.filter((v2) => !existingVideoIds.has(v2.videoId) && !excludedSet.has(v2.videoId));
  if (newVideos.length === 0) {
    return { seriesId, seriesName, newEpisodes: 0, message: "Up to date" };
  }
  const durations = await fetchVideoDurations2(
    newVideos.map((v2) => v2.videoId),
    youtubeApiKey
  );
  const maxEpisode = existingEpisodes.reduce(
    (max, ep) => Math.max(max, ep.episode_number || 0),
    0
  );
  const episodesToInsert = newVideos.map((video, index2) => ({
    series_id: seriesId,
    episode_number: maxEpisode + index2 + 1,
    title: video.title,
    description: video.description || null,
    video_url: video.videoId,
    thumbnail_url: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
    video_type: "youtube",
    duration: durations[video.videoId] || null,
    is_published: true
  }));
  const insertRes = await fetch(
    `${supabaseUrl}/rest/v1/islamvoice_episodes`,
    {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(episodesToInsert)
    }
  );
  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`Failed to insert episodes: ${errText}`);
  }
  return {
    seriesId,
    seriesName,
    newEpisodes: newVideos.length,
    episodes: newVideos.map((v2) => v2.title)
  };
}
async function fetchAllPlaylistItems2(playlistId, apiKey) {
  const videos = [];
  let nextPageToken = "";
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
    const res = await fetch(url, {
      headers: { "Referer": "https://tafsirkurd.com/" }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`YouTube API error: ${errText}`);
    }
    const data = await res.json();
    for (const item of data.items || []) {
      const snippet = item.snippet;
      if (!snippet?.resourceId?.videoId) continue;
      if (snippet.title === "Deleted video" || snippet.title === "Private video") continue;
      videos.push({
        videoId: snippet.resourceId.videoId,
        title: snippet.title,
        description: snippet.description || "",
        thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.standard?.url || snippet.thumbnails?.medium?.url || "",
        position: snippet.position
      });
    }
    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);
  return videos;
}
async function fetchVideoDurations2(videoIds, apiKey) {
  const durations = {};
  for (let i2 = 0; i2 < videoIds.length; i2 += 50) {
    const batchIds = videoIds.slice(i2, i2 + 50).join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`;
    const res = await fetch(url, {
      headers: { "Referer": "https://tafsirkurd.com/" }
    });
    if (!res.ok) continue;
    const data = await res.json();
    for (const item of data.items || []) {
      if (item.contentDetails?.duration) {
        durations[item.id] = parseISO8601Duration2(item.contentDetails.duration);
      }
    }
  }
  return durations;
}
function parseISO8601Duration2(iso8601) {
  const match2 = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match2) return null;
  return parseInt(match2[1] || 0) * 3600 + parseInt(match2[2] || 0) * 60 + parseInt(match2[3] || 0);
}
var init_sync_playlists = __esm({
  "sync-playlists.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest39, "onRequest");
    __name(syncSeries2, "syncSeries");
    __name(fetchAllPlaylistItems2, "fetchAllPlaylistItems");
    __name(fetchVideoDurations2, "fetchVideoDurations");
    __name(parseISO8601Duration2, "parseISO8601Duration");
  }
});

// test-brevo-email.js
async function onRequest40(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 503, headers: corsHeaders });
  }
  const sessionRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${(/* @__PURE__ */ new Date()).toISOString()}&select=user_id`,
    { headers: { "apikey": supabaseServiceKey, "Authorization": `Bearer ${supabaseServiceKey}` } }
  );
  const sessions = sessionRes.ok ? await sessionRes.json() : [];
  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: corsHeaders });
  }
  try {
    const data = await request.json();
    const { email } = data;
    if (!env.BREVO_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Brevo API key not configured in environment variables"
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: `Test email would be sent to ${email}`,
        note: "Brevo API integration pending"
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Test email error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}
var init_test_brevo_email = __esm({
  "test-brevo-email.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest40, "onRequest");
  }
});

// test-db.js
async function onRequest41(context) {
  const { env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://tafsirkurd.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Debug-Secret",
    "Content-Type": "application/json"
  };
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const debugSecret = env.DEBUG_SECRET;
  const providedSecret = context.request.headers.get("X-Debug-Secret");
  if (!debugSecret || providedSecret !== debugSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const checks = {
      hasSupabaseUrl: !!env.SUPABASE_URL,
      hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 30) + "..." : "NOT SET"
    };
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
          checks
        }),
        { status: 500, headers: corsHeaders }
      );
    }
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    const { data, error, count } = await supabase.from("admin_users").select("email, role, is_active", { count: "exact" }).limit(5);
    if (error) {
      return new Response(
        JSON.stringify({
          error: "Database query failed",
          details: error.message,
          code: error.code,
          checks
        }),
        { status: 500, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Database connection working!",
        checks,
        adminCount: count
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Exception occurred",
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_test_db = __esm({
  "test-db.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    __name(onRequest41, "onRequest");
  }
});

// update-config.js
async function onRequest42(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=30"
    // 30s CDN cache
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
    const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, "");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Config error" }), { status: 500, headers: corsHeaders });
    }
    const UPDATE_KEYS = [
      "update_mode",
      // legacy: 'off' | 'soft' | 'hard' (overrides stage when set)
      "update_stage",
      // 'release' | 'soft' | 'enforce'
      "update_release_time",
      // ISO timestamp when soft stage started (for auto-transition timer)
      "update_enforce_delay_hours",
      // hours after release_time before soft auto-transitions to hard
      "latest_version",
      // current published version (informational, shown in UI)
      "min_ios_version",
      // minimum required iOS build — trigger update if installed < this
      "min_android_version",
      // minimum required Android build
      "ios_store_url",
      "android_store_url",
      "soft_update_cooldown_days",
      // days before re-showing soft banner after dismiss
      "update_whats_new",
      // optional short release notes shown in soft banner
      "update_sent_at",
      // ISO timestamp updated on every admin save — resets user snooze
      // legacy key — kept for backward compat
      "force_update_enabled"
    ];
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.(${UPDATE_KEYS.join(",")})`,
      { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) throw new Error("DB error " + res.status);
    const rows = await res.json();
    const config = {};
    for (const row of rows) config[row.key] = row.value;
    return new Response(JSON.stringify(config), { status: 200, headers: corsHeaders });
  } catch (e2) {
    return new Response(JSON.stringify({ error: "fetch_failed" }), { status: 502, headers: corsHeaders });
  }
}
var init_update_config = __esm({
  "update-config.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest42, "onRequest");
  }
});

// user-data.js
async function onRequest43(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "";
  const ALLOWED_ORIGINS = ["https://tafsirkurd.com", "capacitor://localhost", "http://localhost"];
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://tafsirkurd.com";
  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }
  const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, "");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: corsHeaders }
    );
  }
  try {
    const body2 = await request.json();
    const { userId, action, data } = body2;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    const authHeader = request.headers.get("Authorization") || "";
    const userToken = authHeader.replace("Bearer ", "");
    if (!userToken) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: corsHeaders }
      );
    }
    const authRes = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${userToken}`
        }
      }
    );
    if (!authRes.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: corsHeaders }
      );
    }
    const authUser = await authRes.json();
    if (!authUser || authUser.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: token does not match userId" }),
        { status: 403, headers: corsHeaders }
      );
    }
    if (action === "load") {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}&select=*`,
        {
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`
          }
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const rows = await response.json();
      if (rows.length === 0) {
        return new Response(
          JSON.stringify({ success: true, data: null }),
          { status: 200, headers: corsHeaders }
        );
      }
      const userData = rows[0];
      const frontendData = {
        stats: {
          ayahsRead: userData.total_ayahs_read || 0,
          streak: userData.reading_streak || 0
        },
        currentPosition: {
          surah: userData.current_surah || 1,
          ayah: userData.current_ayah || 1
        },
        bookmarks: userData.bookmarks || [],
        readAyahs: userData.completed_surahs?.readAyahs || [],
        ayahReadTimes: userData.reading_history?.ayahReadTimes || {}
      };
      return new Response(
        JSON.stringify({ success: true, data: frontendData }),
        { status: 200, headers: corsHeaders }
      );
    }
    if (action === "save") {
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Data required for save" }),
          { status: 400, headers: corsHeaders }
        );
      }
      const dbData = {
        user_id: userId,
        current_surah: data.currentPosition?.surah || 1,
        current_ayah: data.currentPosition?.ayah || 1,
        total_ayahs_read: data.stats?.ayahsRead || 0,
        reading_streak: data.stats?.streak || 0,
        bookmarks: data.bookmarks || [],
        completed_surahs: { readAyahs: data.readAyahs || [] },
        reading_history: { ayahReadTimes: data.ayahReadTimes || {} },
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}&select=id`,
        {
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`
          }
        }
      );
      const existing = await checkResponse.json();
      let saveResponse;
      if (existing.length > 0) {
        saveResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: "PATCH",
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify(dbData)
          }
        );
      } else {
        dbData.created_at = (/* @__PURE__ */ new Date()).toISOString();
        saveResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_data`,
          {
            method: "POST",
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify(dbData)
          }
        );
      }
      if (!saveResponse.ok) {
        const errText = await saveResponse.text();
        throw new Error(`Failed to save: ${errText}`);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("User data error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
var init_user_data = __esm({
  "user-data.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest43, "onRequest");
  }
});

// widget-health-report.js
async function onRequest44(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return new Response('{"error":"POST only"}', { status: 405, headers: corsHeaders });
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1e3;
  if (_recentIps5.has(ip)) {
    const entry = _recentIps5.get(ip);
    if (now - entry.start < windowMs && entry.count >= 6)
      return new Response('{"error":"rate_limit"}', { status: 429, headers: corsHeaders });
    if (now - entry.start >= windowMs) _recentIps5.set(ip, { start: now, count: 1 });
    else entry.count++;
  } else {
    _recentIps5.set(ip, { start: now, count: 1 });
  }
  try {
    let san = function(v2, maxLen) {
      if (v2 === null || v2 === void 0) return null;
      return String(v2).slice(0, maxLen || 100);
    }, sanNum = function(v2, max) {
      return typeof v2 === "number" && isFinite(v2) ? Math.min(v2, max || 999999) : null;
    };
    __name(san, "san");
    __name(sanNum, "sanNum");
    const body2 = await request.json();
    if (!body2.status)
      return new Response('{"error":"missing required fields"}', { status: 400, headers: corsHeaders });
    const row = {
      device_id: san(body2.device_id, 64),
      city: san(body2.city, 80),
      status: san(body2.status, 40),
      age_min: sanNum(body2.age_min, 99999),
      payload_len: sanNum(body2.payload_len, 9999999),
      source: san(body2.source, 60),
      write_status: san(body2.write_status, 20),
      ext_age_h: sanNum(body2.ext_age_h, 9999),
      diagnostics: body2.diagnostics && typeof body2.diagnostics === "object" ? body2.diagnostics : null,
      app_version: san(body2.app_version, 20),
      ios_ver: san(body2.ios_ver, 20),
      platform: san(body2.platform, 20) || "ios",
      // Enriched snapshot fields (prayer.ui.js >= 20260523)
      current_prayer: san(body2.current_prayer, 20),
      next_prayer: san(body2.next_prayer, 20),
      snapshot_date: san(body2.snapshot_date, 12),
      today_baghdad: san(body2.today_baghdad, 12),
      snapshot_stale: body2.snapshot_stale === true ? true : body2.snapshot_stale === false ? false : null,
      valid_until: sanNum(body2.valid_until, 9999999999999)
    };
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error } = await supabase.from("widget_health_reports").insert(row);
    if (error) {
      console.error("[widget-health-report] insert error:", error.message);
      return new Response('{"error":"db_error"}', { status: 500, headers: corsHeaders });
    }
    return new Response('{"ok":true}', { status: 200, headers: corsHeaders });
  } catch (e2) {
    console.error("[widget-health-report] error:", e2);
    return new Response('{"error":"bad_request"}', { status: 400, headers: corsHeaders });
  }
}
var _recentIps5;
var init_widget_health_report = __esm({
  "widget-health-report.js"() {
    init_functionsRoutes_0_6071133848472854();
    init_module5();
    _recentIps5 = /* @__PURE__ */ new Map();
    __name(onRequest44, "onRequest");
  }
});

// _middleware.js
async function onRequest45(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (!url.pathname.includes("islamvoice") || !url.searchParams.get("video")) {
    return next();
  }
  const videoId = url.searchParams.get("video");
  const userAgent = request.headers.get("user-agent") || "";
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|googlebot|bingbot/i.test(userAgent);
  if (!isCrawler) {
    return next();
  }
  try {
    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, "");
    const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, "");
    if (!supabaseUrl || !supabaseKey) {
      return next();
    }
    const apiResponse = await fetch(
      `${supabaseUrl}/rest/v1/islamvoice_episodes?id=eq.${videoId}&select=id,title,description,thumbnail_url,islamvoice_series(name_ku)`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );
    if (!apiResponse.ok) {
      return next();
    }
    const videos = await apiResponse.json();
    const video = videos[0];
    if (!video) {
      return next();
    }
    const title = video.title || "\u062F\u06D5\u0646\u06AF\u06CE \u0626\u06CC\u0633\u0644\u0627\u0645\u06CE";
    const description = video.description || video.islamvoice_series?.name_ku || "\u0628\u0628\u06CC\u0646\u06D5 \u0632\u0646\u062C\u06CC\u0631\u06D5\u06CC\u06CE\u0646 \u06A4\u06CC\u062F\u06CC\u0648\u06CC\u06CC \u06CC\u06CE\u0646 \u0626\u06CC\u0633\u0644\u0627\u0645\u06CC";
    const thumbnail = video.thumbnail_url || "https://tafsirkurd.com/assets/images/og-image.png";
    const videoUrl = `https://tafsirkurd.com/islamvoice.html?video=${videoId}`;
    const crawlerHtml = `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - \u062A\u06D5\u0641\u0633\u06CC\u0631 \u06A9\u0648\u0631\u062F</title>
    <meta property="og:type" content="video.other">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(thumbnail)}">
    <meta property="og:image:width" content="1280">
    <meta property="og:image:height" content="720">
    <meta property="og:url" content="${escapeHtml(videoUrl)}">
    <meta property="og:site_name" content="\u062A\u06D5\u0641\u0633\u06CC\u0631 \u06A9\u0648\u0631\u062F">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(thumbnail)}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(videoUrl)}">
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}">
    <p><a href="${escapeHtml(videoUrl)}">Watch on TafsirKurd</a></p>
</body>
</html>`;
    return new Response(crawlerHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("OG middleware error:", error);
    return next();
  }
}
function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
var init_middleware = __esm({
  "_middleware.js"() {
    init_functionsRoutes_0_6071133848472854();
    __name(onRequest45, "onRequest");
    __name(escapeHtml, "escapeHtml");
  }
});

// ../.wrangler/tmp/pages-pFiWTT/functionsRoutes-0.6071133848472854.mjs
var routes;
var init_functionsRoutes_0_6071133848472854 = __esm({
  "../.wrangler/tmp/pages-pFiWTT/functionsRoutes-0.6071133848472854.mjs"() {
    init_admin_app_versions_api();
    init_admin_auth();
    init_admin_auth_OLD_BACKUP();
    init_admin_books();
    init_admin_bump_version();
    init_admin_db_health_api();
    init_admin_errors_api();
    init_admin_github_commits();
    init_admin_management();
    init_admin_messages_api();
    init_admin_notifications_api();
    init_admin_stats();
    init_admin_translations_api();
    init_admin_users_data();
    init_app_error_report();
    init_app_translations();
    init_app_version_report();
    init_auto_notify();
    init_brevo_email_stats();
    init_check_env();
    init_config();
    init_cron_sync();
    init_delete_account();
    init_device_fingerprint();
    init_get_client_ip();
    init_google_analytics();
    init_google_search_console();
    init_i18n_health_report();
    init_pdf_proxy();
    init_popup_config();
    init_prayer_health_report();
    init_prayer_kurd();
    init_push_notifications();
    init_register_push_token();
    init_s3_upload();
    init_search_console();
    init_send_bulk_email();
    init_send_email_notification();
    init_sync_playlists();
    init_test_brevo_email();
    init_test_db();
    init_update_config();
    init_user_data();
    init_widget_health_report();
    init_middleware();
    routes = [
      {
        routePath: "/admin-app-versions-api",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/admin-auth",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest2]
      },
      {
        routePath: "/admin-auth-OLD-BACKUP",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest3]
      },
      {
        routePath: "/admin-books",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest4]
      },
      {
        routePath: "/admin-bump-version",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest5]
      },
      {
        routePath: "/admin-db-health-api",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest6]
      },
      {
        routePath: "/admin-errors-api",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest7]
      },
      {
        routePath: "/admin-github-commits",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest8]
      },
      {
        routePath: "/admin-management",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest9]
      },
      {
        routePath: "/admin-messages-api",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest10]
      },
      {
        routePath: "/admin-notifications-api",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest11]
      },
      {
        routePath: "/admin-stats",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest12]
      },
      {
        routePath: "/admin-translations-api",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest13]
      },
      {
        routePath: "/admin-users-data",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest14]
      },
      {
        routePath: "/app-error-report",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest15]
      },
      {
        routePath: "/app-translations",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest16]
      },
      {
        routePath: "/app-version-report",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest17]
      },
      {
        routePath: "/auto-notify",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest18]
      },
      {
        routePath: "/brevo-email-stats",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest19]
      },
      {
        routePath: "/check-env",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest20]
      },
      {
        routePath: "/config",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest21]
      },
      {
        routePath: "/cron-sync",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest22]
      },
      {
        routePath: "/delete-account",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest23]
      },
      {
        routePath: "/device-fingerprint",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest24]
      },
      {
        routePath: "/get-client-ip",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest25]
      },
      {
        routePath: "/google-analytics",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest26]
      },
      {
        routePath: "/google-search-console",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest27]
      },
      {
        routePath: "/i18n-health-report",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest28]
      },
      {
        routePath: "/pdf-proxy",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest29]
      },
      {
        routePath: "/popup-config",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest30]
      },
      {
        routePath: "/prayer-health-report",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest31]
      },
      {
        routePath: "/prayer-kurd",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest32]
      },
      {
        routePath: "/push-notifications",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest33]
      },
      {
        routePath: "/register-push-token",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest34]
      },
      {
        routePath: "/s3-upload",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest35]
      },
      {
        routePath: "/search-console",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest36]
      },
      {
        routePath: "/send-bulk-email",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest37]
      },
      {
        routePath: "/send-email-notification",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest38]
      },
      {
        routePath: "/sync-playlists",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest39]
      },
      {
        routePath: "/test-brevo-email",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest40]
      },
      {
        routePath: "/test-db",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest41]
      },
      {
        routePath: "/update-config",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest42]
      },
      {
        routePath: "/user-data",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest43]
      },
      {
        routePath: "/widget-health-report",
        mountPath: "/",
        method: "",
        middlewares: [],
        modules: [onRequest44]
      },
      {
        routePath: "/",
        mountPath: "/",
        method: "",
        middlewares: [onRequest45],
        modules: []
      }
    ];
  }
});

// C:/Users/saman/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
init_functionsRoutes_0_6071133848472854();

// C:/Users/saman/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
init_functionsRoutes_0_6071133848472854();
function lexer(str) {
  var tokens = [];
  var i2 = 0;
  while (i2 < str.length) {
    var char = str[i2];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i2, value: str[i2++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i2++, value: str[i2++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i2, value: str[i2++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i2, value: str[i2++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i2 + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i2));
      tokens.push({ type: "NAME", index: i2, value: name });
      i2 = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i2 + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i2));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i2));
      tokens.push({ type: "PATTERN", index: i2, value: pattern });
      i2 = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i2, value: str[i2++] });
  }
  tokens.push({ type: "END", index: i2, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i2 = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i2 < tokens.length && tokens[i2].type === type)
      return tokens[i2++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i2], nextType = _a2.type, index2 = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index2, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i2 < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x2) {
    return x2;
  } : _a;
  return function(pathname) {
    var m2 = re.exec(pathname);
    if (!m2)
      return false;
    var path = m2[0], index2 = m2.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i3) {
      if (m2[i3] === void 0)
        return "continue";
      var key = keys[i3 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m2[i3].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m2[i3], key);
      }
    }, "_loop_1");
    for (var i2 = 1; i2 < m2.length; i2++) {
      _loop_1(i2);
    }
    return { path, index: index2, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index2 = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index2++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x2) {
    return x2;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/saman/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};

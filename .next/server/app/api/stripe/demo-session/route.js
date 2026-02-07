"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/stripe/demo-session/route";
exports.ids = ["app/api/stripe/demo-session/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fstripe%2Fdemo-session%2Froute&page=%2Fapi%2Fstripe%2Fdemo-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fdemo-session%2Froute.ts&appDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fstripe%2Fdemo-session%2Froute&page=%2Fapi%2Fstripe%2Fdemo-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fdemo-session%2Froute.ts&appDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_user_Documents_New_project_app_api_stripe_demo_session_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/stripe/demo-session/route.ts */ \"(rsc)/./app/api/stripe/demo-session/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/stripe/demo-session/route\",\n        pathname: \"/api/stripe/demo-session\",\n        filename: \"route\",\n        bundlePath: \"app/api/stripe/demo-session/route\"\n    },\n    resolvedPagePath: \"/Users/user/Documents/New project/app/api/stripe/demo-session/route.ts\",\n    nextConfigOutput,\n    userland: _Users_user_Documents_New_project_app_api_stripe_demo_session_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/stripe/demo-session/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZzdHJpcGUlMkZkZW1vLXNlc3Npb24lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnN0cmlwZSUyRmRlbW8tc2Vzc2lvbiUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnN0cmlwZSUyRmRlbW8tc2Vzc2lvbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnVzZXIlMkZEb2N1bWVudHMlMkZOZXclMjBwcm9qZWN0JTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnVzZXIlMkZEb2N1bWVudHMlMkZOZXclMjBwcm9qZWN0JmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNzQjtBQUNuRztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL2FvLW1hdGNoaW5nLXBsYXRmb3JtLz80N2FjIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy91c2VyL0RvY3VtZW50cy9OZXcgcHJvamVjdC9hcHAvYXBpL3N0cmlwZS9kZW1vLXNlc3Npb24vcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL3N0cmlwZS9kZW1vLXNlc3Npb24vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9zdHJpcGUvZGVtby1zZXNzaW9uXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9zdHJpcGUvZGVtby1zZXNzaW9uL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL3VzZXIvRG9jdW1lbnRzL05ldyBwcm9qZWN0L2FwcC9hcGkvc3RyaXBlL2RlbW8tc2Vzc2lvbi9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvc3RyaXBlL2RlbW8tc2Vzc2lvbi9yb3V0ZVwiO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICBzZXJ2ZXJIb29rcyxcbiAgICAgICAgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBvcmlnaW5hbFBhdGhuYW1lLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fstripe%2Fdemo-session%2Froute&page=%2Fapi%2Fstripe%2Fdemo-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fdemo-session%2Froute.ts&appDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/stripe/demo-session/route.ts":
/*!**********************************************!*\
  !*** ./app/api/stripe/demo-session/route.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_stripe__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../lib/stripe */ \"(rsc)/./lib/stripe.ts\");\n\n\nasync function POST(req) {\n    const { title, amount, requestId } = await req.json();\n    if (!title || !amount || !requestId) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Missing fields\"\n        }, {\n            status: 400\n        });\n    }\n    const session = await _lib_stripe__WEBPACK_IMPORTED_MODULE_1__.stripe.checkout.sessions.create({\n        mode: \"payment\",\n        payment_method_types: [\n            \"card\"\n        ],\n        line_items: [\n            {\n                price_data: {\n                    currency: \"jpy\",\n                    product_data: {\n                        name: title\n                    },\n                    unit_amount: amount\n                },\n                quantity: 1\n            }\n        ],\n        payment_intent_data: {\n            capture_method: \"manual\"\n        },\n        metadata: {\n            request_id: requestId\n        },\n        success_url: `${\"http://localhost:3000\"}/demo/checkout-success?session_id={CHECKOUT_SESSION_ID}`,\n        cancel_url: `${\"http://localhost:3000\"}/demo/checkout-cancel?request_id=${requestId}`\n    });\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        url: session.url\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3N0cmlwZS9kZW1vLXNlc3Npb24vcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQXdEO0FBQ1I7QUFFekMsZUFBZUUsS0FBS0MsR0FBZ0I7SUFDekMsTUFBTSxFQUFFQyxLQUFLLEVBQUVDLE1BQU0sRUFBRUMsU0FBUyxFQUFFLEdBQUcsTUFBTUgsSUFBSUksSUFBSTtJQUVuRCxJQUFJLENBQUNILFNBQVMsQ0FBQ0MsVUFBVSxDQUFDQyxXQUFXO1FBQ25DLE9BQU9OLHFEQUFZQSxDQUFDTyxJQUFJLENBQUM7WUFBRUMsT0FBTztRQUFpQixHQUFHO1lBQUVDLFFBQVE7UUFBSTtJQUN0RTtJQUVBLE1BQU1DLFVBQVUsTUFBTVQsK0NBQU1BLENBQUNVLFFBQVEsQ0FBQ0MsUUFBUSxDQUFDQyxNQUFNLENBQUM7UUFDcERDLE1BQU07UUFDTkMsc0JBQXNCO1lBQUM7U0FBTztRQUM5QkMsWUFBWTtZQUNWO2dCQUNFQyxZQUFZO29CQUNWQyxVQUFVO29CQUNWQyxjQUFjO3dCQUFFQyxNQUFNaEI7b0JBQU07b0JBQzVCaUIsYUFBYWhCO2dCQUNmO2dCQUNBaUIsVUFBVTtZQUNaO1NBQ0Q7UUFDREMscUJBQXFCO1lBQ25CQyxnQkFBZ0I7UUFDbEI7UUFDQUMsVUFBVTtZQUNSQyxZQUFZcEI7UUFDZDtRQUNBcUIsYUFBYSxDQUFDLEVBQUVDLHVCQUErQixDQUFDLHVEQUF1RCxDQUFDO1FBQ3hHRyxZQUFZLENBQUMsRUFBRUgsdUJBQStCLENBQUMsaUNBQWlDLEVBQUV0QixVQUFVLENBQUM7SUFDL0Y7SUFFQSxPQUFPTixxREFBWUEsQ0FBQ08sSUFBSSxDQUFDO1FBQUV5QixLQUFLdEIsUUFBUXNCLEdBQUc7SUFBQztBQUM5QyIsInNvdXJjZXMiOlsid2VicGFjazovL2FvLW1hdGNoaW5nLXBsYXRmb3JtLy4vYXBwL2FwaS9zdHJpcGUvZGVtby1zZXNzaW9uL3JvdXRlLnRzP2ZhOWUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuaW1wb3J0IHsgc3RyaXBlIH0gZnJvbSBcIi4uLy4uLy4uLy4uL2xpYi9zdHJpcGVcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxOiBOZXh0UmVxdWVzdCkge1xuICBjb25zdCB7IHRpdGxlLCBhbW91bnQsIHJlcXVlc3RJZCB9ID0gYXdhaXQgcmVxLmpzb24oKTtcblxuICBpZiAoIXRpdGxlIHx8ICFhbW91bnQgfHwgIXJlcXVlc3RJZCkge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIk1pc3NpbmcgZmllbGRzXCIgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgfVxuXG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBzdHJpcGUuY2hlY2tvdXQuc2Vzc2lvbnMuY3JlYXRlKHtcbiAgICBtb2RlOiBcInBheW1lbnRcIixcbiAgICBwYXltZW50X21ldGhvZF90eXBlczogW1wiY2FyZFwiXSxcbiAgICBsaW5lX2l0ZW1zOiBbXG4gICAgICB7XG4gICAgICAgIHByaWNlX2RhdGE6IHtcbiAgICAgICAgICBjdXJyZW5jeTogXCJqcHlcIixcbiAgICAgICAgICBwcm9kdWN0X2RhdGE6IHsgbmFtZTogdGl0bGUgfSxcbiAgICAgICAgICB1bml0X2Ftb3VudDogYW1vdW50XG4gICAgICAgIH0sXG4gICAgICAgIHF1YW50aXR5OiAxXG4gICAgICB9XG4gICAgXSxcbiAgICBwYXltZW50X2ludGVudF9kYXRhOiB7XG4gICAgICBjYXB0dXJlX21ldGhvZDogXCJtYW51YWxcIlxuICAgIH0sXG4gICAgbWV0YWRhdGE6IHtcbiAgICAgIHJlcXVlc3RfaWQ6IHJlcXVlc3RJZFxuICAgIH0sXG4gICAgc3VjY2Vzc191cmw6IGAke3Byb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkx9L2RlbW8vY2hlY2tvdXQtc3VjY2Vzcz9zZXNzaW9uX2lkPXtDSEVDS09VVF9TRVNTSU9OX0lEfWAsXG4gICAgY2FuY2VsX3VybDogYCR7cHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTH0vZGVtby9jaGVja291dC1jYW5jZWw/cmVxdWVzdF9pZD0ke3JlcXVlc3RJZH1gXG4gIH0pO1xuXG4gIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IHVybDogc2Vzc2lvbi51cmwgfSk7XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwic3RyaXBlIiwiUE9TVCIsInJlcSIsInRpdGxlIiwiYW1vdW50IiwicmVxdWVzdElkIiwianNvbiIsImVycm9yIiwic3RhdHVzIiwic2Vzc2lvbiIsImNoZWNrb3V0Iiwic2Vzc2lvbnMiLCJjcmVhdGUiLCJtb2RlIiwicGF5bWVudF9tZXRob2RfdHlwZXMiLCJsaW5lX2l0ZW1zIiwicHJpY2VfZGF0YSIsImN1cnJlbmN5IiwicHJvZHVjdF9kYXRhIiwibmFtZSIsInVuaXRfYW1vdW50IiwicXVhbnRpdHkiLCJwYXltZW50X2ludGVudF9kYXRhIiwiY2FwdHVyZV9tZXRob2QiLCJtZXRhZGF0YSIsInJlcXVlc3RfaWQiLCJzdWNjZXNzX3VybCIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1BVQkxJQ19BUFBfVVJMIiwiY2FuY2VsX3VybCIsInVybCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/stripe/demo-session/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/stripe.ts":
/*!***********************!*\
  !*** ./lib/stripe.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   stripe: () => (/* binding */ stripe)\n/* harmony export */ });\n/* harmony import */ var stripe__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! stripe */ \"(rsc)/./node_modules/stripe/esm/stripe.esm.node.js\");\n\nconst stripe = new stripe__WEBPACK_IMPORTED_MODULE_0__[\"default\"](process.env.STRIPE_SECRET_KEY, {\n    apiVersion: \"2023-10-16\"\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3RyaXBlLnRzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQTRCO0FBRXJCLE1BQU1DLFNBQVMsSUFBSUQsOENBQU1BLENBQUNFLFFBQVFDLEdBQUcsQ0FBQ0MsaUJBQWlCLEVBQUc7SUFDL0RDLFlBQVk7QUFDZCxHQUFHIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYW8tbWF0Y2hpbmctcGxhdGZvcm0vLi9saWIvc3RyaXBlLnRzPzBlMzMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFN0cmlwZSBmcm9tIFwic3RyaXBlXCI7XG5cbmV4cG9ydCBjb25zdCBzdHJpcGUgPSBuZXcgU3RyaXBlKHByb2Nlc3MuZW52LlNUUklQRV9TRUNSRVRfS0VZISwge1xuICBhcGlWZXJzaW9uOiBcIjIwMjMtMTAtMTZcIlxufSk7XG4iXSwibmFtZXMiOlsiU3RyaXBlIiwic3RyaXBlIiwicHJvY2VzcyIsImVudiIsIlNUUklQRV9TRUNSRVRfS0VZIiwiYXBpVmVyc2lvbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/stripe.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/stripe","vendor-chunks/math-intrinsics","vendor-chunks/es-errors","vendor-chunks/qs","vendor-chunks/call-bind-apply-helpers","vendor-chunks/get-proto","vendor-chunks/object-inspect","vendor-chunks/has-symbols","vendor-chunks/gopd","vendor-chunks/function-bind","vendor-chunks/side-channel","vendor-chunks/side-channel-weakmap","vendor-chunks/side-channel-map","vendor-chunks/side-channel-list","vendor-chunks/hasown","vendor-chunks/get-intrinsic","vendor-chunks/es-object-atoms","vendor-chunks/es-define-property","vendor-chunks/dunder-proto","vendor-chunks/call-bound"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fstripe%2Fdemo-session%2Froute&page=%2Fapi%2Fstripe%2Fdemo-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fdemo-session%2Froute.ts&appDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fuser%2FDocuments%2FNew%20project&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();
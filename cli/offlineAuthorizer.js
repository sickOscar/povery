"use strict";
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const atob = (base64) => {
        return Buffer.from(base64, 'base64').toString('binary');
    };
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}
exports.handler = function (event, context, callback) {
    const jwt = parseJwt(event.authorizationToken);
    const response = {
        principalId: "aPrinciapalId",
        policyDocument: {
            Version: "2012-10-17",
            Statement: [{
                    Action: "execute-api:Invoke",
                    Effect: "Allow",
                    Resource: event.methodArn
                }]
        },
        usageIdentifierKey: "offline_access",
        context: Object.assign({}, jwt)
    };
    context.succeed(response);
};
//# sourceMappingURL=offlineAuthorizer.js.map
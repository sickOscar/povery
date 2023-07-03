import {api, controller} from "../src/decorators";
import {runAuthorization} from "../src/auth";
jest.mock('../src/execution_context');

describe("runAuthorization", () => {

    it("should return the context", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            path: "/",
            requestContext: {
                authorizer: {
                    claims: {}
                }
            }
        };

        @controller
        class aController {
            @api('GET', '/')
            async get() {}
        }

        const newContext = await runAuthorization(context, event, aController, {});
        expect(newContext).toBe(context);
    })

    it("should throw an error if claims are not found", async () => {
        const context = {};
        const event = {
            httpMethod: "GET",
            requestContext: {
                authorizer: {}
            }
        };

        @controller
        class aController {}

        await expect(runAuthorization(context, event, aController, {})).rejects.toThrow("No claims found");

    })

})

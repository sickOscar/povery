import {runAuthorization} from "../src/auth";
jest.mock('../src/execution_context');

describe("runAuthorization", () => {

    it("should return the context", async () => {
        const context = {};
        const event = {
            requestContext: {
                authorizer: {
                    claims: {}
                }
            }
        };
        const controller = {};
        const newContext = await runAuthorization(context, event, controller);
        expect(newContext).toBe(context);
    })

    it("should throw an error if claims are not found", async () => {
        const context = {};
        const event = {
            requestContext: {
                authorizer: {}
            }
        };
        const controller = {};
        await expect(runAuthorization(context, event, controller)).rejects.toThrow("No claims found");
    })

})
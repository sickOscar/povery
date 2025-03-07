// Mock AWS X-Ray SDK
jest.mock('aws-xray-sdk', () => ({
    getSegment: jest.fn().mockReturnValue({
        addNewSubsegment: jest.fn().mockReturnValue({
            close: jest.fn()
        })
    })
}));

// Set environment to development to bypass X-Ray in local mode
process.env.NODE_ENV = 'development'; 
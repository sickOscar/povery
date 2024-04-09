import {povery, controller, api} from 'povery'

@controller
class Controller {

    @api('GET', '/test')
    sayHello() {
        return `We're povery!`
    }
}

exports.handler = povery.load(Controller);

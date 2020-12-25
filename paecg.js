class PaECG {
    constructor(submission_element, user_inputs, javascript, policyurl, thirdparties = []) {
        if ((typeof (submission_element)) != 'string') {
            throw "Expected `string` Given " + submission_element;
        }
        if (!Array.isArray(user_inputs)) {
            throw "Expected `Array` Given " + user_inputs;
        }
        if (!Array.isArray(javascript)) {
            throw "Expected `Array` Given " + javascript;
        }
        if (!Array.isArray(policyurl)) {
            throw "Expected `Array` Given " + policyurl;
        }
        if (!Array.isArray(thirdparties)) {
            throw "Expected `Array` Given " + policyurl;
        }

        this.submission_element = submission_element;
        this.user_inputs = user_inputs;
        this.javascript = javascript;
        this.policyurl = policyurl;
        this.thirdparties = thirdparties;
    }

    setup() {
        document.getElementById("Submit").addEventListener("click", ()=>this.runProtocol(), true);
    }
    runProtocol() {
        var PII = {}
        for (var thisInput of this.user_inputs) {
            PII[thisInput] = document.getElementById(thisInput).value;
        }
        window.postMessage({
            type: "FROM_PAGE",
            PII: PII,
            title: 'fetchConsentDetails',
            thirdparties: this.thirdparties,
            javascriptUrls:this.javascript,
            policyUrls:this.policyurl
        }, "*");
            console.log('message sent to content script');
    
    }

}
import KeywordReact from "../models/keywordReact";

function addKeywordReact(user: { userID: String, keyword: String, react: String }): any {
    console.log(`Adding user: ${user}`);
    const newuser = new KeywordReact(user);

    newuser.save((err, product) => {
        if (err) {
            console.error('addUser Error: ', err);
            return err
        } else {
            //console.log("Product: ", product)
            return product
        }
    })
}

async function fetchKeywordReactByUserID(userID: String): Promise<any[]> {
    const promise = new Promise<Object[]>((resolve, reject) => {
        //console.log(`Searching for userID: ${userID}`);
        let response: any = "f";
        KeywordReact.find({ userID: userID })
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                reject(err)
            })
    })

    return promise
}

export { addKeywordReact, fetchKeywordReactByUserID };

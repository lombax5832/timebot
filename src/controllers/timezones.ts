import Timezones from '../models/timezones';

function addUser(user: { userID: String, timezone: String }): any {
    console.log(`Adding user: ${user}`);
    const newuser = new Timezones(user);

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

async function fetchByUserID(userID: String): Promise<any[]> {
    const promise = new Promise<Object[]>((resolve, reject) => {
        //console.log(`Searching for userID: ${userID}`);
        let response: any = "f";
        Timezones.find({ userID: userID })
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                reject(err)
            })
    })

    return promise
}

async function updateUser(user: { userID: String, timezone: String }): Promise<any> {
    console.log(`Adding user: ${user}`);


    return await Timezones.findOneAndUpdate({ userID: user.userID }, { timezone: user.timezone }, { new: true, upsert: true })
}
export { addUser, updateUser, fetchByUserID };

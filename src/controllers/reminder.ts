import Reminder from '../models/reminder';

function addReminder(reminder: { serverID: String, channel: String, sender: String, message: string, mention: string, timestamp: number }): any {
    console.log(`Adding Reminder: ${reminder.toString()}`);
    const newcommand = new Reminder(reminder);
    let productId;
    newcommand.save((err, product) => {
        if (err) {
            console.error('addReminder Error: ', err);
            return err
        } else {
            productId = product.id;
            return product
        }
    })

    return newcommand.id;
}

function removeReminder(command: { serverID: String, channel: String, timestamp: String }): any {
    console.log(`Removing reminder: `, command);

    Reminder.deleteOne(command)
}

async function fetchAllReminders(serverID: String): Promise<any[]> {
    const promise = new Promise<Object[]>((resolve, reject) => {
        let response: any = "f";
        Reminder.find({ })
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                reject(err)
            })
    })

    return promise
}
export { addReminder, removeReminder, fetchAllReminders };

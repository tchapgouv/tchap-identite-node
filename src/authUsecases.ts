import {MatrixClient} from "matrix-bot-sdk";

export const makeSendCodeToAccount = (matrixClient: MatrixClient, otpGenerator: any, otpRepository: any) => async (email: string) => {
    const otp = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
    })

    await otpRepository.save({
        otp,
        accountId: '1'
    });

    // notify_user([TchapStrategy, EmailStrategy])
    await matrixClient.sendMessage('!lWPxYxCRAQGzPvmeDZ:i.tchap.gouv.fr', {
        "msgtype": "m.notice",
        "body": `OTP généré: ${otp}`,
    })

    return otp;
}

export const makeValidateAccountWithCode = (otpRepository: any, usersRepository: any) => async (accountId: string, otp: string) => {
    // const accountId = await Account.authenticate(req.body.email, req.body.password);
    accountId = '1';
    if (!accountId) {
        throw Error('Account not found')
    }

    const foundOtp = await otpRepository.find(accountId);
    if (otp !== foundOtp) {
        throw Error('Invalid code')
    }

    return accountId;
}

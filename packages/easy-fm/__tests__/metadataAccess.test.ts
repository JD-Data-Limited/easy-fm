import {ApiLayoutMetadata, stripInaccessibleMetadata} from '../dist/models/apiResults.js'

describe('inaccessible metadata', () => {
    it('accepts and removes FileMaker no-access placeholders', () => {
        const normal = {name: 'Name', type: 'normal', displayType: 'editText', result: 'text', global: false, autoEnter: false, fourDigitYear: false, maxRepeat: 1, maxCharacters: 0, notEmpty: false, numeric: false, timeOfDay: false, repetitionStart: 1, repetitionEnd: 1}
        const inaccessible = {...normal, name: '<No Access>', type: 'invalid', result: 'invalid'}
        const metadata = ApiLayoutMetadata.parse({fieldMetaData: [normal, inaccessible], portalMetaData: {Rows: [inaccessible]}})
        expect(stripInaccessibleMetadata(metadata)).toMatchObject({fieldMetaData: [{name: 'Name'}], portalMetaData: {Rows: []}})
    })
})

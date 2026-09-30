import FMHost from '@jd-data-limited/easy-fm';
// 2 layouts found
const HOST = new FMHost('https://carlson45-d.jd-data.com', '780', 'true');
HOST.database();
const LAYOUTS = {
    WEB_API_DEXIE_CHANGES: HOST.getLayout('Web_API_Dexie_Changes'),
    API_ASSETS: HOST.getLayout('API_Assets'),
};

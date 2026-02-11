export const generateVCard = (data: {
    firstName: string;
    lastName: string;
    organization: string;
    title: string;
    email: string;
    phone: string;
    address: string;
    url?: string;
}) => {
    const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${data.lastName};${data.firstName};;;`,
        `FN:${data.firstName} ${data.lastName}`,
        `ORG:${data.organization}`,
        `TITLE:${data.title}`,
        `EMAIL;type=INTERNET;type=WORK:${data.email}`,
        `TEL;type=CELL:${data.phone}`,
        `ADR;type=WORK:;;${data.address};;;;`,
        data.url ? `URL:${data.url}` : '',
        'END:VCARD'
    ].join('\n');

    return vcard;
};

export const downloadVCard = (vcardString: string, filename: string) => {
    const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

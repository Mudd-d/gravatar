/* eslint-disable import/no-unresolved */

import type { Options, Attach } from '../dist';
import { Hovercards } from '../dist';

addEventListener( 'DOMContentLoaded', () => {
	// To test types
	const options: Options = {
		placement: 'top',
		// To test the empty about me case
		myHash: '99c3338797c95c418d9996bd39931506',
	};
	const hovercards = new Hovercards( options );

	// To test type
	const attach: Attach = ( target, opts ) => {
		hovercards.attach( target, opts );
	};
	attach( document.body, { ignoreSelector: '' } );

	// To test sanitization
	document.getElementById( 'inline-hovercard' )?.appendChild(
		Hovercards.createHovercard( {
			hash: '4f615f4811330c1883eb440d6621e7c2bb8e4bbb610f74e1159d2973a0aea99f',
			avatarUrl: 'https://0.gravatar.com/avatar/a8fb08baaca16a8c0c87177d3d54499b?size=128',
			profileUrl: 'https://joaoheringer.link',
			displayName: 'Joao Heringer',
			location: 'BH - Brazil',
			description:
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus velit tellus, eleifend ut accumsan ut, imperdiet in nisi. Pellentesque ac fringilla nibh, nec malesuada urna.',
			jobTitle: 'Frontend Scribbler',
			company: 'Automattic',
			headerImage:
				"url('https://2.gravatar.com/userimage/209214672/cdebd0ed415afa2e562ba5c34b1570c2?size=1024') no-repeat 50% 1% / 100%",
			backgroundColor: 'linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)',
			verifiedAccounts: [
				{
					type: 'github',
					label: 'GitHub',
					icon: 'https://gravatar.com/icons/github.svg',
					url: 'https://github.com/jcheringer',
					isHidden: false,
				},
				{
					type: 'instagram',
					label: 'Instagram',
					icon: 'https://gravatar.com/icons/instagram.svg',
					url: 'https://instagram.com/jc.heringer',
					isHidden: false,
				},
				{
					type: 'calendly',
					label: 'Calendly',
					icon: 'https://gravatar.com/icons/calendly.svg',
					url: 'https://calendly.com/joao-heringer',
					isHidden: false,
				},
				{
					type: 'wordpress',
					label: 'WordPress',
					icon: 'https://gravatar.com/icons/wordpress.svg',
					url: 'https://jcheringer.blog',
					isHidden: true,
				},
			],
			contactInfo: {
				// home_phone: '',
				// work_phone: '',
				// cell_phone: '12312312312',
				// email: 'email@email.com',
				// contact_form: '',
				//calendar: 'https://calendar.com',
			},
			payments: {
				links: [],
				crypto_wallets: [
					{
						label: 'Ethereum',
						address: '0xAbc12312',
					},
				],
			},
		} )
	);

	// To test hovercard skeleton
	document.getElementById( 'hovercard-skeleton' )?.appendChild( Hovercards.createHovercardSkeleton() );

	// To test error hovercard
	document
		.getElementById( 'hovercard-error' )
		?.appendChild(
			Hovercards.createHovercardError(
				'https://1.gravatar.com/avatar/767fc9c115a1b989744c755db47feb60?d=retro&r=g',
				'This is a test message'
			)
		);
} );

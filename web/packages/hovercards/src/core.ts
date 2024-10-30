import type { Placement } from './compute-position';
import computePosition from './compute-position';
import { escUrl, escHtml } from './sanitizer';
import addQueryArg from './add-query-arg';
import __ from './i18n';

interface AccountData {
	service_type: string;
	service_label: string;
	service_icon: string;
	url: string;
	is_hidden: boolean;
}

export interface VerifiedAccount {
	type: string;
	label: string;
	icon: string;
	url: string;
	isHidden: boolean;
}

export interface ContactInfo {
	home_phone: string;
	work_phone: string;
	cell_phone: string;
	email: string;
	contact_form: string;
	calendar: string;
}

export interface Payments {
	links?: { label: string; url: string }[];
	crypto_wallets?: { label: string; address: string }[];
}

export interface ProfileData {
	hash: string;
	avatarUrl: string;
	profileUrl: string;
	displayName: string;
	location?: string;
	description?: string;
	jobTitle?: string;
	company?: string;
	headerImage?: string;
	backgroundColor?: string;
	verifiedAccounts?: VerifiedAccount[];
	contactInfo?: ContactInfo;
	payments?: Payments;
}

export interface CreateHovercardOptions {
	additionalClass?: string;
	myHash?: string;
	i18n?: Record< string, string >;
}

export type CreateHovercard = ( profileData: ProfileData, options?: CreateHovercardOptions ) => HTMLDivElement;

export interface CreateHovercardSkeletonOptions {
	additionalClass?: string;
}

export type CreateHovercardSkeleton = ( options?: CreateHovercardSkeletonOptions ) => HTMLDivElement;

export interface CreateHovercardErrorOptions {
	avatarAlt?: string;
	additionalClass?: string;
}

export type CreateHovercardError = (
	avatarUrl: string,
	message: string,
	options?: CreateHovercardErrorOptions
) => HTMLDivElement;

export type Attach = ( target: HTMLElement, options?: { dataAttributeName?: string; ignoreSelector?: string } ) => void;

export type Detach = () => void;

export type OnQueryHovercardRef = ( ref: HTMLElement ) => HTMLElement;

export type OnFetchProfileStart = ( hash: string ) => void;

export type OnFetchProfileSuccess = ( hash: string, profileData: ProfileData ) => void;

export type FetchProfileError = { code: number; message: string };

export type OnFetchProfileFailure = ( hash: string, error: FetchProfileError ) => void;

export type OnHovercardShown = ( hash: string, hovercard: HTMLDivElement ) => void;

export type OnHovercardHidden = ( hash: string, hovercard: HTMLDivElement ) => void;

export type Options = Partial< {
	placement: Placement;
	offset: number;
	autoFlip: boolean;
	delayToShow: number;
	delayToHide: number;
	additionalClass: string;
	myHash: string;
	i18n: Record< string, string >;
	onQueryHovercardRef: OnQueryHovercardRef;
	onFetchProfileStart: OnFetchProfileStart;
	onFetchProfileSuccess: OnFetchProfileSuccess;
	onFetchProfileFailure: OnFetchProfileFailure;
	onHovercardShown: OnHovercardShown;
	onHovercardHidden: OnHovercardHidden;
} >;

interface HovercardRef {
	id: string;
	hash: string;
	params: string;
	ref: HTMLElement;
}

const BASE_API_URL = 'https://api.gravatar.com/v3/profiles';

const dc = document;

export default class Hovercards {
	// Options
	_placement: Placement;
	_offset: number;
	_autoFlip: boolean;
	_delayToShow: number;
	_delayToHide: number;
	_additionalClass: string;
	_myHash: string;
	_onQueryHovercardRef: OnQueryHovercardRef;
	_onFetchProfileStart: OnFetchProfileStart;
	_onFetchProfileSuccess: OnFetchProfileSuccess;
	_onFetchProfileFailure: OnFetchProfileFailure;
	_onHovercardShown: OnHovercardShown;
	_onHovercardHidden: OnHovercardHidden;
	_i18n: Record< string, string > = {};

	// Variables
	_hovercardRefs: HovercardRef[] = [];
	_showHovercardTimeoutIds = new Map< string, ReturnType< typeof setTimeout > >();
	_hideHovercardTimeoutIds = new Map< string, ReturnType< typeof setTimeout > >();
	_cachedProfiles = new Map< string, ProfileData >();

	constructor( {
		placement = 'right',
		autoFlip = true,
		offset = 10,
		delayToShow = 500,
		delayToHide = 300,
		additionalClass = '',
		myHash = '',
		onQueryHovercardRef = ( ref ) => ref,
		onFetchProfileStart = () => {},
		onFetchProfileSuccess = () => {},
		onFetchProfileFailure = () => {},
		onHovercardShown = () => {},
		onHovercardHidden = () => {},
		i18n = {},
	}: Options = {} ) {
		this._placement = placement;
		this._autoFlip = autoFlip;
		this._offset = offset;
		this._delayToShow = delayToShow;
		this._delayToHide = delayToHide;
		this._additionalClass = additionalClass;
		this._myHash = myHash;
		this._onQueryHovercardRef = onQueryHovercardRef;
		this._onFetchProfileStart = onFetchProfileStart;
		this._onFetchProfileSuccess = onFetchProfileSuccess;
		this._onFetchProfileFailure = onFetchProfileFailure;
		this._onHovercardShown = onHovercardShown;
		this._onHovercardHidden = onHovercardHidden;
		this._i18n = i18n;
	}

	/**
	 * Queries hovercard refs on or within the target element
	 *
	 * @param {HTMLElement} target            - The element to query.
	 * @param {string}      dataAttributeName - Data attribute name associated with Gravatar hashes.
	 * @param {string}      [ignoreSelector]  - The selector to ignore certain elements.
	 * @return {HTMLElement[]}                - The queried hovercard refs.
	 * @private
	 */
	_queryHovercardRefs( target: HTMLElement, dataAttributeName: string, ignoreSelector?: string ) {
		let refs: HTMLElement[] = [];
		const camelAttrName = dataAttributeName.replace( /-([a-z])/g, ( g ) => g[ 1 ].toUpperCase() );
		const ignoreRefs = ignoreSelector ? Array.from( dc.querySelectorAll( ignoreSelector ) ) : [];
		const matchPath = 'gravatar.com/avatar/';

		if (
			( camelAttrName && target.dataset[ camelAttrName ] ) ||
			( target.tagName === 'IMG' && ( target as HTMLImageElement ).src.includes( matchPath ) )
		) {
			refs = [ target ];
		} else {
			refs = Array.from( target.querySelectorAll( `img[src*="${ matchPath }"]` ) );

			if ( dataAttributeName ) {
				refs = [
					// Filter out images that already have the data attribute
					...refs.filter( ( img ) => ! img.hasAttribute( `data-${ dataAttributeName }` ) ),
					...Array.from< HTMLElement >( target.querySelectorAll( `[data-${ dataAttributeName }]` ) ),
				];
			}
		}

		this._hovercardRefs = refs
			.map( ( ref, idx ) => {
				if ( ignoreRefs.includes( ref ) ) {
					return null;
				}

				let hash;
				let params;
				const dataAttrValue = ref.dataset[ camelAttrName ];

				if ( dataAttrValue ) {
					hash = dataAttrValue.split( '?' )[ 0 ];
					params = dataAttrValue;
				} else if ( ref.tagName === 'IMG' ) {
					hash = ( ref as HTMLImageElement ).src.split( '/' ).pop().split( '?' )[ 0 ];
					params = ( ref as HTMLImageElement ).src;
				}

				if ( ! hash ) {
					return null;
				}

				const p = new URLSearchParams( params );
				const d = p.get( 'd' ) || p.get( 'default' );
				const f = p.get( 'f' ) || p.get( 'forcedefault' );
				const r = p.get( 'r' ) || p.get( 'rating' );
				params = [ d && `d=${ d }`, f && `f=${ f }`, r && `r=${ r }` ].filter( Boolean ).join( '&' );

				return {
					id: `gravatar-hovercard-${ hash }-${ idx }`,
					hash,
					params: params ? `?${ params }` : '',
					ref: this._onQueryHovercardRef( ref ) || ref,
				};
			} )
			.filter( Boolean );

		return this._hovercardRefs;
	}

	/**
	 * Creates a hovercard element with the provided profile data.
	 *
	 * @param {ProfileData} profileData               - The profile data to populate the hovercard.
	 * @param {Object}      [options]                 - Optional parameters for the hovercard.
	 * @param {string}      [options.additionalClass] - Additional CSS class for the hovercard.
	 * @param {string}      [options.myHash]          - The hash of the current user.
	 * @param {Object}      [options.i18n]            - The i18n object.
	 * @return {HTMLDivElement}                       - The created hovercard element.
	 */
	static createHovercard: CreateHovercard = ( profileData, { additionalClass, myHash, i18n = {} } = {} ) => {
		const {
			hash,
			avatarUrl,
			profileUrl,
			displayName,
			location,
			description,
			jobTitle,
			company,
			headerImage,
			verifiedAccounts = [],
			backgroundColor,
		} = profileData;

		const hovercard = dc.createElement( 'div' );
		hovercard.className = `gravatar-hovercard${ additionalClass ? ` ${ additionalClass }` : '' }`;

		const trackedProfileUrl = escUrl( addQueryArg( profileUrl, 'utm_source', 'hovercard' ) );
		const username = escHtml( displayName );
		const isEditProfile = ! description && myHash === hash;
		const renderSocialLinks = verifiedAccounts
			.slice( 0, 3 )
			.reduce( ( links, { label, icon, url, type, isHidden } ) => {
				if ( isHidden ) {
					return links;
				}

				links.push( `
					<a class="gravatar-hovercard__social-link" href="${ escUrl( url ) }" target="_blank" data-service-name="${ type }">
						<img class="gravatar-hovercard__social-icon" src="${ escUrl( icon ) }" width="32" height="32" alt="${ escHtml(
							label
						) }" />
					</a>
				` );

				return links;
			}, [] )
			.join( '' );

		const jobInfo = [ jobTitle, company ].filter( Boolean ).join( ', ' );

		hovercard.innerHTML = `
			<div class="gravatar-hovercard__inner">
				
				${ headerImage ? `<span class="gravatar-hovercard__header-image" style="background: ${ headerImage }"></span>` : '' }
				<div class="gravatar-hovercard__header">
					<a class="gravatar-hovercard__avatar-link" href="${ trackedProfileUrl }" target="_blank">
						<img class="gravatar-hovercard__avatar" src="${ escUrl( avatarUrl ) }" width="104" height="104" alt="${ username }" />
					</a>
					<a class="gravatar-hovercard__personal-info-link" href="${ trackedProfileUrl }" target="_blank">
						<h4 class="gravatar-hovercard__name">${ username }</h4>
						${ jobInfo ? `<p class="gravatar-hovercard__job">${ escHtml( jobInfo ) }</p>` : '' }
						${ location ? `<p class="gravatar-hovercard__location">${ escHtml( location ) }</p>` : '' }
					</a>
				</div>
				<div class="gravatar-hovercard__body">
					${ description ? `<p class="gravatar-hovercard__description">${ escHtml( description ) }</p>` : '' }
				</div>
				<div class="gravatar-hovercard__social-links">
					<img class="gravatar-hovercard__verified-icon" src="https://secure.gravatar.com/icons/verified.svg" width="24" height="24" title="Verified accounts" alt="Verified icon">
					<a class="gravatar-hovercard__social-link" href="${ trackedProfileUrl }" target="_blank" data-service-name="gravatar">
						<img class="gravatar-hovercard__social-icon" src="https://secure.gravatar.com/icons/gravatar.svg" width="32" height="32" alt="Gravatar" />
					</a>
					${ renderSocialLinks }
				</div>
				<div class="gravatar-hovercard__footer">
					<span class="gravatar-hovercard__profile-url">${ profileUrl.replace( 'https://', '' ) }</span>
					<a
						class="gravatar-hovercard__profile-link${ isEditProfile ? ' gravatar-hovercard__profile-link--edit' : '' }"
						href="${ isEditProfile ? 'https://gravatar.com/profiles/edit?utm_source=hovercard' : trackedProfileUrl }"
						target="_blank"
					>
						<span class="gravatar-hovercard__profile-link-text">
							${ isEditProfile ? __( i18n, 'Edit your profile' ) : __( i18n, 'View profile' ) }
						</span>
						<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
							<path d="M12.6667 8.33338L9.16666 12.1667M12.6667 8.33338L2.66666 8.33338M12.6667 8.33338L9.16666 4.83338" stroke-width="1.5"/>
						</svg>
					</a>
				</div>
				${
					backgroundColor
						? `<span class="gravatar-hovercard__profile-color" style="background: ${ backgroundColor }"></span>`
						: ''
				}
			</div>
		`;

		this._handleCtaButtons( hovercard, profileData, i18n );

		return hovercard;
	};

	/**
	 * Handles contactInfo and payment data to add the CTA buttons and drawers
	 *
	 * @param {HTMLElement} hovercard   - The hovercard DOM element
	 * @param {ProfileData} profileData - The profile data to populate the hovercard.
	 * @param {Object}      i18n        - The i18n object.
	 * @return {void}
	 * @private
	 */
	static _handleCtaButtons( hovercard: HTMLElement, profileData: ProfileData, i18n: {} ): void {
		let buttonsWrapper;
		const { contactInfo, payments } = profileData;
		const hovercardInner = hovercard.querySelector( '.gravatar-hovercard__inner' );
		const socialLinks = hovercardInner.querySelector( '.gravatar-hovercard__social-links' );

		const createElement = ( element: string, cssClass?: string ): HTMLElement => {
			const el = dc.createElement( element );

			if ( cssClass ) {
				el.className = cssClass;
			}

			return el;
		};

		const createButton = ( text: string, onClick: () => void ): HTMLElement => {
			const button = createElement( 'button', 'gravatar-hovercard__button' );
			button.innerText = text;
			button.onclick = onClick;

			return button;
		};

		const createDrawer = (
			titleText: string,
			cssClass: string,
			items: { icon?: string; label: string; value: string; url?: string }[]
		) => {
			const drawer = createElement( 'div', 'gravatar-hovercard__drawer' );
			drawer.classList.add( cssClass );
			hovercardInner.appendChild( drawer );

			const backdrop = createElement( 'div', 'gravatar-hovercard__drawer-backdrop' );
			backdrop.onclick = () => closeDrawer( `.${ cssClass }` );
			drawer.appendChild( backdrop );

			const card = createElement( 'div', 'gravatar-hovercard__drawer-card' );
			drawer.appendChild( card );

			const header = createElement( 'div', 'gravatar-hovercard__drawer-header' );
			card.appendChild( header );

			const title = createElement( 'h1', 'gravatar-hovercard__drawer-title' );
			title.innerText = titleText;
			header.appendChild( title );

			const closeButton = createElement( 'button', 'gravatar-hovercard__drawer-close' );
			closeButton.onclick = () => closeDrawer( `.${ cssClass }` );
			closeButton.innerHTML = `
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M12 13.0607L15.7123 16.773L16.773 15.7123L13.0607 12L16.773 8.28772L15.7123 7.22706L12 10.9394L8.28771 7.22705L7.22705 8.28771L10.9394 12L7.22706 15.7123L8.28772 16.773L12 13.0607Z" fill="#101517"/>
				</svg>
			`;
			header.appendChild( closeButton );

			const ul = createElement( 'ul', 'gravatar-hovercard__drawer-items' );
			card.appendChild( ul );

			items.forEach( ( item ) => {
				const el = createElement( 'li', 'gravatar-hovercard__drawer-item' );

				if ( item.icon ) {
					const icon = createElement( 'img', 'gravatar-hovercard__drawer-item-icon' ) as HTMLImageElement;
					icon.width = 24;
					icon.height = 24;
					icon.src = item.icon;
					el.appendChild( icon );
				}

				const info = createElement( 'div', 'gravatar-hovercard__drawer-item-info' );
				el.appendChild( info );

				const label = createElement( 'span', 'gravatar-hovercard__drawer-item-label' );
				label.innerText = item.label;
				info.appendChild( label );

				const text = createElement( 'span', 'gravatar-hovercard__drawer-item-text' );
				info.appendChild( text );

				if ( item.url ) {
					const link = createElement( 'a' ) as HTMLAnchorElement;
					link.href = item.url;
					link.target = '_blank';
					link.innerText = item.value;
					text.appendChild( link );
				} else {
					text.innerText = item.value;
				}

				ul.appendChild( el );
			} );
		};

		const openDrawer = ( selector: string ) => {
			const drawer = hovercardInner.querySelector( selector );

			if ( ! drawer ) {
				return;
			}

			drawer.classList.add( 'gravatar-hovercard__drawer--open' );
		};

		const closeDrawer = ( selector: string ) => {
			const drawer = hovercardInner.querySelector( selector );

			if ( ! drawer ) {
				return;
			}

			drawer.classList.add( 'gravatar-hovercard__drawer--closing' );
			drawer.classList.remove( 'gravatar-hovercard__drawer--open' );

			setTimeout( () => {
				drawer.classList.remove( 'gravatar-hovercard__drawer--closing' );
			}, 300 );
		};

		const contactsData = Object.entries( contactInfo || {} ).filter( ( [ _, value ] ) => !! value );

		if ( contactsData.length ) {
			const drawerCssClass = 'gravatar-hovercard__drawer--contact';
			const icons: { [ key: string ]: string } = {
				email: 'icons/mail.svg',
				home_phone: 'icons/home-phone.svg',
				work_phone: 'icons/work-phone.svg',
				cell_phone: 'icons/mobile-phone.svg',
				contact_form: 'icons/envelope.svg',
				calendar: 'icons/calendar.svg',
			};

			const getUrl = ( type: string, value: string ) => {
				switch ( type ) {
					case 'email':
						return `mailto:${ value }`;
					case 'contact_form':
					case 'calendar':
						return value.startsWith( 'http' ) ? value : null;
					default:
						return null;
				}
			};

			const items = contactsData.map( ( [ key, value ]: string[] ) => {
				return {
					icon: `https://secure.gravatar.com/${ icons[ key ] }`,
					label: key.replace( '_', ' ' ),
					value: value.replace( /^(https?:\/\/)/, '' ),
					url: getUrl( key, value ),
				};
			} );

			createDrawer( __( i18n, 'Contact' ), drawerCssClass, items );

			if ( ! buttonsWrapper ) {
				buttonsWrapper = createElement( 'div', 'gravatar-hovercard__buttons' );
				socialLinks.after( buttonsWrapper );
			}

			const contactButton = createButton( __( i18n, 'Contact' ), () => {
				openDrawer( `.${ drawerCssClass }` );
			} );

			buttonsWrapper.appendChild( contactButton );
		}

		if ( payments?.links?.length || payments?.crypto_wallets?.length ) {
			const drawerCssClass = 'gravatar-hovercard__drawer--send-money';
			const iconUrl = 'https://secure.gravatar.com/icons/link.svg';

			const links = payments.links.map( ( item ) => {
				return {
					label: item.label,
					value: item.url.replace( /^(https?:\/\/)/, '' ),
					url: item.url,
					icon: iconUrl,
				};
			} );

			const crypto = payments.crypto_wallets.map( ( item ) => {
				return {
					label: item.label,
					value: item.address,
					icon: iconUrl,
				};
			} );

			createDrawer( __( i18n, 'Send money' ), drawerCssClass, [ ...links, ...crypto ] );

			if ( ! buttonsWrapper ) {
				buttonsWrapper = createElement( 'div', 'gravatar-hovercard__buttons' );
				socialLinks.after( buttonsWrapper );
			}

			const sendMoneyButton = createButton( __( i18n, 'Send money' ), () => {
				openDrawer( `.${ drawerCssClass }` );
			} );

			buttonsWrapper.appendChild( sendMoneyButton );
		}
	}

	/**
	 * Creates a skeleton hovercard element.
	 *
	 * @param {Object} [options]                 - Optional parameters for the skeleton hovercard.
	 * @param {string} [options.additionalClass] - Additional CSS class for the skeleton hovercard.
	 * @return {HTMLDivElement}                  - The created skeleton hovercard element.
	 */
	static createHovercardSkeleton: CreateHovercardSkeleton = ( { additionalClass } = {} ) => {
		const hovercard = dc.createElement( 'div' );
		hovercard.className = `gravatar-hovercard gravatar-hovercard--skeleton${
			additionalClass ? ` ${ additionalClass }` : ''
		}`;

		hovercard.innerHTML = `
			<div class="gravatar-hovercard__inner">
				<div class="gravatar-hovercard__header">
					<div class="gravatar-hovercard__avatar-link"></div>
					<div class="gravatar-hovercard__personal-info-link"></div>
				</div>
				<div class="gravatar-hovercard__footer">
					<div class="gravatar-hovercard__social-link"></div>
					<div class="gravatar-hovercard__profile-link""></div>
				</div>
			</div>
    	`;

		return hovercard;
	};

	/**
	 * Creates an error hovercard element.
	 *
	 * @param {string} avatarUrl                 - The URL of the avatar image.
	 * @param {string} message                   - The error message to display.
	 * @param {Object} [options]                 - Optional parameters for the error hovercard.
	 * @param {string} [options.avatarAlt]       - The alt text for the avatar image.
	 * @param {string} [options.additionalClass] - Additional CSS class for the error hovercard.
	 * @return {HTMLDivElement}                  - The created error hovercard element.
	 */
	static createHovercardError: CreateHovercardError = (
		avatarUrl,
		message,
		{ avatarAlt = 'Avatar', additionalClass } = {}
	) => {
		const hovercard = dc.createElement( 'div' );
		hovercard.className = `gravatar-hovercard gravatar-hovercard--error${
			additionalClass ? ` ${ additionalClass }` : ''
		}`;

		hovercard.innerHTML = `
			<div class="gravatar-hovercard__inner">
				<img class="gravatar-hovercard__avatar" src="${ avatarUrl }" width="104" height="104" alt="${ avatarAlt }" />
				<i class="gravatar-hovercard__error-message">${ message }</i>
			</div>
    	`;

		return hovercard;
	};

	/**
	 * Waits for a specified delay and fetches the user's profile data,
	 * then shows the hovercard relative to the ref element.
	 *
	 * @param {HovercardRef} hovercardRef - The hovercard ref object.
	 * @return {void}
	 * @private
	 */
	_showHovercard( { id, hash, params, ref }: HovercardRef ) {
		const timeoutId = setTimeout( () => {
			if ( dc.getElementById( id ) ) {
				return;
			}

			const urlParams = new URLSearchParams( params );
			if ( ! urlParams.has( 's' ) ) {
				urlParams.append( 's', '128' );
				params = `?${ urlParams.toString() }`;
			}

			let hovercard: HTMLDivElement;

			if ( this._cachedProfiles.has( hash ) ) {
				const profile = this._cachedProfiles.get( hash );

				hovercard = Hovercards.createHovercard(
					{ ...profile, avatarUrl: profile.avatarUrl + params },
					{
						additionalClass: this._additionalClass,
						myHash: this._myHash,
						i18n: this._i18n,
					}
				);
			} else {
				hovercard = Hovercards.createHovercardSkeleton( { additionalClass: this._additionalClass } );

				this._onFetchProfileStart( hash );

				fetch( addQueryArg( `${ BASE_API_URL }/${ hash }`, 'source', 'hovercard' ) )
					.then( ( res ) => {
						// API error handling
						if ( res.status !== 200 ) {
							throw res.status;
						}

						return res.json();
					} )
					.then( ( data ) => {
						this._cachedProfiles.set( hash, {
							hash: data.hash,
							avatarUrl: data.avatar_url,
							profileUrl: data.profile_url,
							displayName: data.display_name,
							location: data.location,
							description: data.description,
							jobTitle: data.job_title,
							company: data.company,
							headerImage: data.header_image,
							backgroundColor: data.background_color,
							verifiedAccounts: data.verified_accounts?.map( ( account: AccountData ) => ( {
								type: account.service_type,
								label: account.service_label,
								icon: account.service_icon,
								url: account.url,
								isHidden: account.is_hidden,
							} ) ),
							contactInfo: data.contact_info,
							payments: data.payments,
						} );

						const profile = this._cachedProfiles.get( hash );
						const hovercardInner = Hovercards.createHovercard(
							{ ...profile, avatarUrl: profile.avatarUrl + params },
							{
								additionalClass: this._additionalClass,
								myHash: this._myHash,
								i18n: this._i18n,
							}
						).firstElementChild;

						hovercard.classList.remove( 'gravatar-hovercard--skeleton' );
						hovercard.replaceChildren( hovercardInner );

						this._onFetchProfileSuccess( hash, this._cachedProfiles.get( hash ) );
					} )
					.catch( ( code ) => {
						let message = __( this._i18n, 'Sorry, we are unable to load this Gravatar profile.' );

						switch ( code ) {
							case 404:
								message = __( this._i18n, 'Profile not found.' );
								break;
							case 429:
								message = __( this._i18n, 'Too Many Requests.' );
								break;
							case 500:
								message = __( this._i18n, 'Internal Server Error.' );
								break;
						}

						const hovercardInner = Hovercards.createHovercardError(
							`https://0.gravatar.com/avatar/${ hash }${ params }`,
							message,
							{ additionalClass: this._additionalClass }
						).firstElementChild;

						hovercard.classList.add( 'gravatar-hovercard--error' );
						hovercard.classList.remove( 'gravatar-hovercard--skeleton' );
						hovercard.replaceChildren( hovercardInner );

						this._onFetchProfileFailure( hash, { code, message } );
					} );
			}

			// Set the hovercard ID here to avoid the show / hide side effect
			hovercard.id = id;
			// Don't hide the hovercard when the mouse is over the hovercard from the ref
			hovercard.addEventListener( 'mouseenter', () => clearInterval( this._hideHovercardTimeoutIds.get( id ) ) );
			hovercard.addEventListener( 'mouseleave', () => this._hideHovercard( id ) );

			// Placing the hovercard at the top-level of the dc to avoid being clipped by overflow
			dc.body.appendChild( hovercard );

			const { x, y, padding, paddingValue } = computePosition( ref, hovercard, {
				placement: this._placement,
				offset: this._offset,
				autoFlip: this._autoFlip,
			} );

			hovercard.style.position = 'absolute';
			hovercard.style.left = `${ x }px`;
			hovercard.style.top = `${ y }px`;
			// To bridge the gap between the ref and the hovercard,
			// ensuring that the hovercard remains visible when the mouse hovers over the gap
			hovercard.style[ padding ] = `${ paddingValue }px`;

			this._onHovercardShown( hash, hovercard );
		}, this._delayToShow );

		this._showHovercardTimeoutIds.set( id, timeoutId );
	}

	/**
	 * Waits for a specified delay and hides the hovercard.
	 *
	 * @param {string} id - The ID associated with the hovercard.
	 * @return {void}
	 * @private
	 */
	_hideHovercard( id: string ) {
		const timeoutId = setTimeout( () => {
			const hovercard = dc.getElementById( id );

			if ( hovercard ) {
				hovercard.remove();
				this._onHovercardHidden( id, hovercard as HTMLDivElement );
			}
		}, this._delayToHide );

		this._hideHovercardTimeoutIds.set( id, timeoutId );
	}

	/**
	 * Handles the mouseenter event for hovercard refs.
	 *
	 * @param {MouseEvent} e            - The mouseenter event object.
	 * @param              hovercardRef - The hovercard ref object.
	 * @return {void}
	 * @private
	 */
	_handleMouseEnter( e: MouseEvent, hovercardRef: HovercardRef ) {
		if ( 'ontouchstart' in dc ) {
			return;
		}

		e.stopImmediatePropagation();

		// Don't hide the hovercard when the mouse is over the ref from the hovercard
		clearInterval( this._hideHovercardTimeoutIds.get( hovercardRef.id ) );
		this._showHovercard( hovercardRef );
	}

	/**
	 * Handles the mouseleave event for hovercard refs.
	 *
	 * @param {MouseEvent} e               - The mouseleave event object.
	 * @param              hovercardRef    - The hovercard ref object.
	 * @param              hovercardRef.id - The ID associated with the hovercard.
	 * @return {void}
	 * @private
	 */
	_handleMouseLeave( e: MouseEvent, { id }: HovercardRef ) {
		if ( 'ontouchstart' in dc ) {
			return;
		}

		e.stopImmediatePropagation();

		clearInterval( this._showHovercardTimeoutIds.get( id ) );
		this._hideHovercard( id );
	}

	/**
	 * Attaches event listeners on or within the target element.
	 *
	 * @param {HTMLElement} target                    - The target element to set.
	 * @param {Object}      [options={}]              - The optional parameters.
	 * @param               options.dataAttributeName - Data attribute name associated with Gravatar hashes.
	 * @param               options.ignoreSelector    - The selector to ignore certain elements.
	 * @return {void}
	 */
	attach: Attach = ( target, { dataAttributeName = 'gravatar-hash', ignoreSelector } = {} ) => {
		if ( ! target ) {
			return;
		}

		this.detach();

		this._queryHovercardRefs( target, dataAttributeName, ignoreSelector ).forEach( ( hovercardRef ) => {
			hovercardRef.ref.addEventListener( 'mouseenter', ( e ) => this._handleMouseEnter( e, hovercardRef ) );
			hovercardRef.ref.addEventListener( 'mouseleave', ( e ) => this._handleMouseLeave( e, hovercardRef ) );
		} );
	};

	/**
	 * Removes event listeners from hovercard refs and resets the stored list of these refs.
	 *
	 * @return {void}
	 */
	detach: Detach = () => {
		if ( ! this._hovercardRefs.length ) {
			return;
		}

		this._hovercardRefs.forEach( ( { ref } ) => {
			ref.removeEventListener( 'mouseenter', () => this._handleMouseEnter );
			ref.removeEventListener( 'mouseleave', () => this._handleMouseLeave );
		} );

		this._hovercardRefs = [];
	};
}

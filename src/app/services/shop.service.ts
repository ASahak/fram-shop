import { Injectable } from '@angular/core';
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from "@angular/fire/firestore";
import { AngularFireStorage } from '@angular/fire/storage';
import { Router } from '@angular/router';
import { Observable, observable } from 'rxjs';
import { CreateUser, Product } from '../models/models';
import * as firebase from 'firebase';
import { map, mergeMap, take } from 'rxjs/operators';
import { AuthServiceService } from './auth-service.service';
import * as Actions from '../store/actions/methods.actions';
import { Store, select } from '@ngrx/store';
import { addProductCart } from '../components/shop/shop-content/shop-content.component'  
interface deleteITEM {
    _userID:string;
    _item:string
}
@Injectable({
    providedIn: 'root'
})
export class ShopService {
    _recetCollectionUsers: AngularFirestoreCollection<CreateUser>;
    _recetDocUsers: AngularFirestoreDocument<CreateUser>;
    _users: Observable<CreateUser[]>;
    _oneProduct: Observable<Product[]>;
    _user: Observable<CreateUser>;
    public _methods:Observable<any>;
    public a ='aas'
    constructor(
        private _afs: AngularFirestore,
        public _afAuth: AngularFireAuth,
        private _router: Router,
        private _storage: AngularFireStorage,
        private _store: Store<any>
    ) {
        this._recetCollectionUsers = this._afs.collection('Users')
        this._methods = this._store.pipe(select('_methods'))
       
     }
    __getAuth() {
        return this._afAuth.authState;
    }
    __getAllUsers():Observable<CreateUser[]> {
        this._users = this._recetCollectionUsers.snapshotChanges()
        .pipe(
            map(changes =>{
                return changes.map(action => {
                    const data = action.payload.doc.data() as CreateUser;
                    data.id = action.payload.doc.id;
                    return data;
                }) 
            })
        )
        return this._users
    }
    __getOneProduct(_urlParams):Observable<any>{
        return new Observable (observer => {
            var sfDocRef = firebase.firestore().collection("Users").doc(_urlParams._ownProductId);
            firebase.firestore()
            .runTransaction(t => {
                return t.get(sfDocRef).then(doc => {
                    var _newProducts = doc.get('myProduct')
                    Array.prototype.map.call(_newProducts, item=>{
                        if(item.idProduct == _urlParams._idProduct){
                            this._oneProduct = item
                            observer.next(this._oneProduct)
                        }
                    })
                    t.update(sfDocRef, {myProduct:_newProducts})
                })
            })
        })
    }
    __updateRaiting(raiting){
        var sfDocRef = firebase.firestore().collection("Users").doc(raiting._userID);
        return firebase.firestore()
        .runTransaction(t => {
            return t.get(sfDocRef).then(doc => {
                var _newProducts = doc.get('myProduct')
                let prodById = {}
                for (let key in _newProducts) {
                    if(_newProducts[key].idProduct === raiting._indexMyProduct) {
                        prodById = _newProducts[key]
                    }
                }
                let _apreciatedCount = 0;
                if(Object.keys(prodById['raiting']).length == 0){
                    prodById['raiting'][raiting._currentUserID] = raiting._indexStar
                }
                else{
                    for (let i in prodById['raiting']) {
                        if(i == raiting._currentUserID){
                            prodById['raiting'][i] = raiting._indexStar
                            break;
                        }
                        else{
                            _apreciatedCount++
                            if(_apreciatedCount == Object.keys(prodById['raiting']).length){
                                prodById['raiting'][raiting._currentUserID] = raiting._indexStar
                            }
                        }
                    }
                }
                t.update(sfDocRef, {myProduct:_newProducts});
            });
        })
        .then(() =>{
            this._store.dispatch(new Actions.FlashMessage({message:"Apreciated was add successfull", timeout:3000, classType:'successFlash'}))
        }).catch(function(err) {
            this._store.dispatch(new Actions.FlashMessage({message:err, timeout:3000, classType:'dangerFlash'}))
        });
    }
    __addProductToCart(_product:addProductCart){
        return new Observable (observer => {
            var sfDocRef = firebase.firestore().collection("Users").doc(_product._currentUserID);
            firebase.firestore()
            .runTransaction(t => {
                return t.get(sfDocRef).then(doc => {
                    let _myCartProducts = doc.get('myCart')
                    if (!_myCartProducts) {
                        _myCartProducts = {}
                    }
                    _myCartProducts[_product._badge[0]] = {}
                    _myCartProducts[_product._badge[0]]['image'] = (_product._badge[1])?_product._badge[1]:''   
                    _myCartProducts[_product._badge[0]]['name'] = _product._badge[2]   
                    _myCartProducts[_product._badge[0]]['priceLatest'] = _product._badge[3]
                    _myCartProducts[_product._badge[0]]['prodCount'] = _product['_inputVal']
                    _myCartProducts[_product._badge[0]]['ownID'] = _product._badge[4]
                    t.update(sfDocRef, {myCart:_myCartProducts})
                    observer.next(_myCartProducts)
                })
            }).then(()=>{
                this._store.dispatch(new Actions.FlashMessage({message:"This item added Your cart successfully", timeout:4000, classType:'succesFlash'}))
            })
        })
    }
    __updateUsersProduct (value, _getCurrentUser) {
        [].slice.call(_getCurrentUser.myProduct).forEach((element, index) => {
            if(element.idProduct === value['idProduct']){
                _getCurrentUser.myProduct[index] = value;
                this._recetCollectionUsers.doc(_getCurrentUser.id).update(_getCurrentUser)
                .then(()=>{
                this._store.dispatch(new Actions.FlashMessage({message:"Product was updated successfull", timeout:3000, classType:'successFlash'}))
                }).catch(err=>this._store.dispatch(new Actions.FlashMessage({message:err, timeout:3000, classType:'dangerFlash'})));
            }
        });
    }
    __addUsersProduct(value, _getCurrentUser){
        if(!_getCurrentUser.myProduct){
            _getCurrentUser.myProduct = []
        }
        _getCurrentUser.myProduct[_getCurrentUser.myProduct.length] = value;
        this._recetCollectionUsers.doc(_getCurrentUser.id).update(_getCurrentUser)
        .then(()=>{
        this._store.dispatch(new Actions.FlashMessage({message:"Product was add successfull", timeout:3000, classType:'successFlash'}))
        }).catch(err=>this._store.dispatch(new Actions.FlashMessage({message:err, timeout:3000, classType:'dangerFlash'})));
    }
    __removeProduct (_ProductItem) {
        return new Observable (observer =>{
            var sfDocRef = firebase.firestore().collection("Users").doc(_ProductItem.idParentUser);
            firebase.firestore()
            .runTransaction(t => {
                return t.get(sfDocRef).then(doc => {
                    let _myProduct = doc.get('myProduct');
                    [].slice.call(_myProduct).map((_elem, _ind) => {
                        if (_elem.idProduct === _ProductItem.idProduct){
                            _myProduct.splice(_ind, 1)
                        }
                    })
                    t.update(sfDocRef, {myProduct:_myProduct})
                    observer.next()
                })
            })
        })
    }
    __deleteProductInCart(payload){
        return new Observable (observer => {
            var sfDocRef = firebase.firestore().collection("Users").doc(payload._userID);
            firebase.firestore()
            .runTransaction(t => {
                return t.get(sfDocRef).then(doc => {
                    let _myCartProducts = doc.get('myCart')
                    for (let item in _myCartProducts){
                        if(item == payload._itemKey){
                            delete _myCartProducts[payload._itemKey]
                        }
                    }
                    t.update(sfDocRef, {myCart:_myCartProducts})
                    observer.next(_myCartProducts)
                })
            }).then(() =>{
                this._store.dispatch(new Actions.FlashMessage({message:"Product item was delete successfull", timeout:3000, classType:'successFlash'}))
            }).catch(function(err) {
                this._store.dispatch(new Actions.FlashMessage({message:err, timeout:3000, classType:'dangerFlash'}))
            });
        })
    };
    __deleteCartItems(_userID):Observable<any>{
        return new Observable (observer =>{
            var sfDocRef = firebase.firestore().collection("Users").doc(_userID);
            firebase.firestore()
            .runTransaction(t => {
                return t.get(sfDocRef).then(doc => {
                    t.update(sfDocRef, {myCart:{}})
                    observer.next()
                })
            })
        })
    }
    __plusORminusCartItemRecet(_value):Observable<boolean>{
        return new Observable (observer =>{
            var sfDocRef = firebase.firestore().collection("Users").doc(_value._userID);
            firebase.firestore()
            .runTransaction(t => {
                return t.get(sfDocRef).then(doc => {
                    var _myCartProducts = doc.get('myCart')
                    for (let item in _myCartProducts){
                        if(item == _value._itemKey){
                            if(_value._type == 'plus'){
                                if(_myCartProducts[item].prodCount < 5){
                                    _myCartProducts[item].prodCount++;
                                    observer.next(true)
                                    this._store.dispatch(new Actions.FlashMessage({message:"Product was add successfull", timeout:1000, classType:'successFlash'}))
                                }
                                else{
                                    observer.next(false)
                                }
                            }
                            if(_value._type == 'minus'){
                                if(_myCartProducts[item].prodCount > 1){
                                    _myCartProducts[item].prodCount--;
                                    observer.next(true)
                                    this._store.dispatch(new Actions.FlashMessage({message:"Product was delete successfull", timeout:1000, classType:'successFlash'}))
                                }
                                else{
                                    observer.next(false)
                                }
                            }
                        }
                    }
                    t.update(sfDocRef, {myCart:_myCartProducts})
                })
            })
        })
    }
}

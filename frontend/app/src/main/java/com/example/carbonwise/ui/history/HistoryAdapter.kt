package com.example.carbonwise.ui.history

import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.R
import com.example.carbonwise.databinding.ItemProductBinding
import com.example.carbonwise.network.ProductItem

class HistoryAdapter(
    private val onProductClick: (String) -> Unit,
    private val onDeleteClick: (String) -> Unit
) : RecyclerView.Adapter<HistoryAdapter.HistoryViewHolder>() {

    private var productList: MutableList<ProductItem> = mutableListOf()

    inner class HistoryViewHolder(private val binding: ItemProductBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(productItem: ProductItem) {
            val scanUuid = productItem.scan_uuid
            val productDetails = productItem.product
            val productId = productDetails?.productId

            binding.textProductName.text = productDetails?.productName ?: "Unknown Product"
            decodeBase64AndSetImage(productDetails?.productImage)

            // Open product info when clicked
            binding.root.setOnClickListener {
                if (!productId.isNullOrEmpty()) {
                    onProductClick(productId)
                }
            }

            // Show delete button
            binding.btnDelete.visibility = View.VISIBLE
            binding.btnDelete.setOnClickListener {
                if (!scanUuid.isNullOrEmpty()) {
                    onDeleteClick(scanUuid)
                    removeItem(adapterPosition) // Remove item immediately
                }
            }
        }

        private fun decodeBase64AndSetImage(base64String: String?) {
            if (base64String.isNullOrEmpty()) {
                binding.imageProduct.setImageResource(android.R.drawable.ic_menu_report_image)
            } else {
                try {
                    val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                    if (bitmap != null) {
                        binding.imageProduct.setImageBitmap(bitmap)
                    } else {
                        binding.imageProduct.setImageResource(R.drawable.ic_placeholder)
                    }
                } catch (e: IllegalArgumentException) {
                    binding.imageProduct.setImageResource(android.R.drawable.ic_menu_report_image)
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HistoryViewHolder {
        val binding = ItemProductBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return HistoryViewHolder(binding)
    }

    override fun onBindViewHolder(holder: HistoryViewHolder, position: Int) {
        holder.bind(productList[position])
    }

    override fun getItemCount(): Int = productList.size

    fun submitList(products: List<ProductItem>) {
        productList.clear()
        productList.addAll(products)
        notifyDataSetChanged()
    }

    fun removeItem(position: Int) {
        if (position in productList.indices) {
            productList.removeAt(position)
            notifyItemRemoved(position)
        }
    }
}
